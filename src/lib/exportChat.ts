import jsPDF from "jspdf";
import { format } from "date-fns";

interface Message {
  role: string;
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ExportData {
  conversation: Conversation;
  messages: Message[];
}

export const exportAsJSON = (data: ExportData) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chat-${data.conversation.title.slice(0, 20)}-${format(new Date(), "yyyy-MM-dd")}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportAsPDF = (data: ExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let y = margin;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.conversation.title, margin, y);
  y += 10;

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Exported on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, margin, y);
  y += 5;
  doc.text(`Conversation started: ${format(new Date(data.conversation.created_at), "MMMM d, yyyy")}`, margin, y);
  y += 15;

  // Messages
  doc.setTextColor(0);
  data.messages.forEach((message) => {
    const isUser = message.role === "user";
    
    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = margin;
    }

    // Role label
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isUser ? 59 : 147, isUser ? 130 : 51, isUser ? 246 : 234); // primary vs accent colors
    doc.text(isUser ? "You" : "AI Assistant", margin, y);
    y += 5;

    // Message time
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");
    doc.text(format(new Date(message.created_at), "MMM d, h:mm a"), margin, y);
    y += 5;

    // Message content
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    
    const lines = doc.splitTextToSize(message.content, maxWidth);
    lines.forEach((line: string) => {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 5;
    });
    
    y += 8;
  });

  doc.save(`chat-${data.conversation.title.slice(0, 20)}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};
