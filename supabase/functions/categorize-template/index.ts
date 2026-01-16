import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const templateContent = JSON.stringify({
      name: template.name,
      description: template.description,
      nodes: template.nodes?.map((n: { type: string; nodeType: string; label: string }) => ({
        type: n.type,
        nodeType: n.nodeType,
        label: n.label
      })),
      conditions: template.conditions
    });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `أنت مساعد ذكي متخصص في تصنيف قوالب سير العمل. 
            
التصنيفات المتاحة هي:
- automation: للأتمتة العامة والمهام المتكررة
- communication: للتواصل والرسائل والإشعارات
- data: للبيانات والتحليل والتخزين
- productivity: للإنتاجية والمهام والتقويم
- customer: لخدمة العملاء والملاحظات
- hr: للموارد البشرية والتوظيف

يجب أن ترد بتصنيف واحد فقط من القائمة أعلاه بناءً على محتوى القالب.`
          },
          {
            role: 'user',
            content: `قم بتحليل قالب سير العمل التالي وحدد التصنيف الأنسب له:

${templateContent}

أجب بتصنيف واحد فقط من: automation, communication, data, productivity, customer, hr`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'يرجى إضافة رصيد للمتابعة.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'حدث خطأ في خدمة الذكاء الاصطناعي' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.toLowerCase().trim() || '';
    
    // Extract the category from the response
    const validCategories = ['automation', 'communication', 'data', 'productivity', 'customer', 'hr'];
    let category = 'automation'; // default
    
    for (const cat of validCategories) {
      if (aiResponse.includes(cat)) {
        category = cat;
        break;
      }
    }

    return new Response(JSON.stringify({ category }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in categorize-template function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
