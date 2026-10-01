import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Lock,
  Paperclip,
  Clock,
  AlertTriangle,
  User,
  Car,
  Star,
  CheckCheck,
  ShieldAlert,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportApi } from "../api";
import { subscribeToTicket, sendTicketMessageSocket, sendTypingStart, sendTypingStop } from "../services/supportSocket";
import type { SupportTicket, SupportMessage, TicketStatus } from "../types";
import toast from "react-hot-toast";

export default function SupportTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<{ fileUrl: string; fileType: string; fileSize: number }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<any>(null);

  const fetchDetails = async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const data = await supportApi.getTicketById(ticketId);
      setTicket(data);
      setMessages(data.messages || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [ticketId]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time socket subscription
  useEffect(() => {
    if (!ticketId) return;

    const unsubscribe = subscribeToTicket(ticketId, {
      onMessageReceive: (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      },
      onStatusChanged: ({ newStatus }) => {
        setTicket((prev) => (prev ? { ...prev, status: newStatus as TicketStatus } : prev));
        toast.success(`Ticket status updated to ${newStatus}`);
      },
      onAgentAssigned: ({ agent }) => {
        setTicket((prev) => (prev ? { ...prev, assignedAdminName: agent.name, assignedAdminId: agent.id } : prev));
      },
      onTypingStart: ({ userId, role }) => {
        if (role !== "agent") {
          setTypingUsers((prev) => Array.from(new Set([...prev, "Customer/Driver"])));
        }
      },
      onTypingStop: () => {
        setTypingUsers([]);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [ticketId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!ticketId) return;
    try {
      const updated = await supportApi.updateTicketStatus(ticketId, newStatus);
      setTicket((prev) => (prev ? { ...prev, status: updated.status } : prev));
      toast.success(`Status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleAssignToMe = async () => {
    if (!ticketId) return;
    try {
      const updated = await supportApi.assignTicket(ticketId);
      setTicket((prev) => (prev ? { ...prev, assignedAdminId: updated.assignedAdminId, status: "assigned" } : prev));
      toast.success("Ticket assigned to you");
      fetchDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign ticket");
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (!ticketId) return;

    sendTypingStart(ticketId);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTypingStop(ticketId);
    }, 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const presigned = await supportApi.getPresignedUrl({
        fileType: file.type || "image/jpeg",
        fileSize: file.size,
        fileName: file.name,
      });

      // Simulate presigned S3 upload (in production uploads file to presigned.uploadUrl)
      setAttachments((prev) => [
        ...prev,
        {
          fileUrl: presigned.fileUrl,
          fileType: file.type || "image/jpeg",
          fileSize: file.size,
        },
      ]);
      toast.success("Attachment added");
    } catch (err: any) {
      toast.error(err.message || "Attachment upload failed");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || (!content.trim() && attachments.length === 0)) return;

    setSending(true);
    try {
      // Send via REST API (backend persists message and broadcasts via Socket.IO)
      const newMsg = await supportApi.addTicketMessage(ticketId, {
        content: content.trim(),
        isInternalNote,
        attachments,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setContent("");
      setAttachments([]);
      setIsInternalNote(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground animate-pulse">Loading ticket workspace...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button onClick={() => navigate("/support/tickets")}>Back to Queue</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-background p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/support/tickets")}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-primary">{ticket.ticketNumber}</span>
              <Badge variant={ticket.userType === "rider" ? "secondary" : "default"}>{ticket.userType}</Badge>
              {ticket.slaBreached && <Badge className="bg-red-600">SLA BREACHED</Badge>}
            </div>
            <h1 className="text-xl font-bold text-foreground mt-0.5">{ticket.subject}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!ticket.assignedAdminId && (
            <Button variant="outline" size="sm" onClick={handleAssignToMe} className="text-purple-600 border-purple-300 hover:bg-purple-50">
              Assign to Me
            </Button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Status:</span>
            <Select value={ticket.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="pending_user">Pending User</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real-time Multi-party Chat */}
        <div className="lg:col-span-2 flex flex-col h-[650px] bg-background border rounded-lg shadow-sm">
          {/* Chat Header */}
          <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Real-Time Conversation Thread
            </span>
            {typingUsers.length > 0 && (
              <span className="text-xs text-blue-600 font-medium animate-pulse">
                {typingUsers.join(", ")} is typing...
              </span>
            )}
          </div>

          {/* Messages Scroll View */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No messages yet in this ticket thread.
              </div>
            ) : (
              messages.map((msg) => {
                const isAgent = msg.senderType === "agent";
                const isInternal = msg.isInternalNote;

                if (msg.messageType === "system_event") {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground font-medium">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                if (isInternal) {
                  return (
                    <div key={msg.id} className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 my-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700 mb-1">
                        <Lock className="size-3.5" /> INTERNAL AGENT NOTE (Confidential)
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-[10px] text-amber-600 mt-2 block text-right">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${isAgent ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className={isAgent ? "bg-primary text-primary-foreground" : "bg-muted"}>
                        {isAgent ? "AG" : "US"}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`rounded-xl p-3 shadow-xs ${
                        isAgent
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted/70 text-foreground rounded-tl-none border"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold opacity-90">
                          {isAgent ? "Support Agent" : "User / Customer"}
                        </span>
                        <span className="text-[10px] opacity-70">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-white/20">
                          {msg.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs bg-black/10 hover:bg-black/20 px-2 py-1 rounded"
                            >
                              <ImageIcon className="size-3" /> Attachment
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Attachments Preview Bar */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 bg-muted/40 border-t flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <span key={i} className="text-xs bg-background border px-2 py-1 rounded flex items-center gap-1">
                  <FileText className="size-3" /> Attached File ({Math.round(att.fileSize / 1024)} KB)
                </span>
              ))}
            </div>
          )}

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 border-t bg-background flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Switch id="internal-note" checked={isInternalNote} onCheckedChange={setIsInternalNote} />
                <label htmlFor="internal-note" className="text-xs font-semibold cursor-pointer text-muted-foreground">
                  {isInternalNote ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <Lock className="size-3" /> Internal Agent Note
                    </span>
                  ) : (
                    "Public Reply to Customer"
                  )}
                </label>
              </div>

              <label className="cursor-pointer text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                <Paperclip className="size-3.5" /> Attach File
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
              </label>
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder={isInternalNote ? "Write an internal note for support team..." : "Type your message..."}
                value={content}
                onChange={handleTyping}
                rows={2}
                className={`resize-none ${isInternalNote ? "bg-amber-50/50 border-amber-300" : ""}`}
              />
              <Button type="submit" disabled={sending || (!content.trim() && attachments.length === 0)} className="h-full px-5">
                <Send className="size-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* Right Sidebar: Context & Metadata */}
        <div className="flex flex-col gap-4">
          {/* User Profile Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="size-4 text-primary" /> Ticket Requester
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="outline" className="capitalize">{ticket.userType}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-mono text-xs truncate max-w-[140px]">{ticket.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{ticket.categoryName || "General"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Linked Ride Card (if present) */}
          {ticket.rideId && (
            <Card className="shadow-sm border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Car className="size-4 text-blue-600" /> Linked Trip Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Ride ID:</span>
                  <span className="font-mono text-xs text-blue-600">{ticket.rideId}</span>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  className="w-full text-xs"
                  onClick={() => navigate(`/rides?query=${ticket.rideId}`)}
                >
                  View Full Trip Audit Log
                </Button>
              </CardContent>
            </Card>
          )}

          {/* SLA & Time Metrics */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="size-4 text-amber-500" /> SLA Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">SLA Deadline:</span>
                <span className="font-medium text-xs">
                  {new Date(ticket.slaDueAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">First Responded:</span>
                <span className="font-medium text-xs">
                  {ticket.firstRespondedAt ? new Date(ticket.firstRespondedAt).toLocaleTimeString() : "Pending"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                {ticket.slaBreached ? (
                  <span className="text-red-600 font-bold text-xs flex items-center gap-1">
                    <AlertTriangle className="size-3" /> SLA Breached
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold text-xs">On Track</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CSAT Evaluation Card (If present) */}
          {ticket.csatRating && (
            <Card className="shadow-sm bg-emerald-50/50 border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                  <Star className="size-4 text-emerald-600 fill-emerald-600" /> CSAT Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-1 text-amber-500 font-bold text-lg">
                  {ticket.csatRating.rating} / 5 Stars
                </div>
                {ticket.csatRating.feedback && (
                  <p className="text-xs text-muted-foreground italic">"{ticket.csatRating.feedback}"</p>
                )}
                {ticket.csatRating.tags && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ticket.csatRating.tags.split(",").map((t, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] bg-background">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
