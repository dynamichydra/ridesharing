import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  FolderTree,
  Plus,
  Edit2,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supportApi } from "../api";
import type { SupportCategory, SupportFaq } from "../types";
import toast from "react-hot-toast";

export default function SupportFaqCategoryPage() {
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [faqs, setFaqs] = useState<SupportFaq[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<SupportCategory> | null>(null);
  const [editingFaq, setEditingFaq] = useState<Partial<SupportFaq> | null>(null);

  const fetchCategories = async () => {
    try {
      const cats = await supportApi.getCategories("both");
      setCategories(cats || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load categories");
    }
  };

  const fetchFaqs = async () => {
    try {
      const res = await supportApi.getFaqs({ page: 1, limit: 50 });
      setFaqs(res.MESSAGE || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load FAQs");
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCategories(), fetchFaqs()]).finally(() => setLoading(false));
  }, []);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;

    try {
      if (editingCategory.id) {
        await supportApi.updateCategory(editingCategory.id, editingCategory);
        toast.success("Category updated");
      } else {
        await supportApi.createCategory(editingCategory);
        toast.success("Category created");
      }
      setIsCategoryOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq?.question || !editingFaq?.answer || !editingFaq?.categoryId) {
      toast.error("Category, question, and answer are required");
      return;
    }

    try {
      if (editingFaq.id) {
        await supportApi.updateFaq(editingFaq.id, editingFaq);
        toast.success("FAQ updated");
      } else {
        await supportApi.createFaq(editingFaq);
        toast.success("FAQ created");
      }
      setIsFaqOpen(false);
      fetchFaqs();
    } catch (err: any) {
      toast.error(err.message || "Failed to save FAQ");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help Center & Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">
            Manage self-service FAQ articles and support topic hierarchy for riders and drivers.
          </p>
        </div>
      </div>

      <Tabs defaultValue="faqs">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="faqs" className="flex items-center gap-2">
            <HelpCircle className="size-4" /> FAQ Articles
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderTree className="size-4" /> Support Categories
          </TabsTrigger>
        </TabsList>

        {/* FAQs Tab Content */}
        <TabsContent value="faqs" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Knowledge Base Articles</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingFaq({ targetRole: "both", isPublished: true });
                  setIsFaqOpen(true);
                }}
              >
                <Plus className="size-4 mr-2" /> Add New FAQ
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Question</TableHead>
                    <TableHead>Target Role</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Helpful (Yes/No)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Loading FAQs...
                      </TableCell>
                    </TableRow>
                  ) : faqs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No FAQ articles created yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    faqs.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium max-w-[300px] truncate" title={f.question}>
                          {f.question}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{f.targetRole}</Badge>
                        </TableCell>
                        <TableCell className="text-xs flex items-center gap-1">
                          <Eye className="size-3 text-muted-foreground" /> {f.viewCount}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="text-emerald-600 font-bold">{f.helpfulYes}</span> / <span className="text-red-500 font-bold">{f.helpfulNo}</span>
                        </TableCell>
                        <TableCell>
                          {f.isPublished ? (
                            <Badge className="bg-emerald-600">Published</Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingFaq(f);
                              setIsFaqOpen(true);
                            }}
                          >
                            <Edit2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab Content */}
        <TabsContent value="categories" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Hierarchical Support Categories</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingCategory({ targetRole: "both", isActive: true, displayOrder: 0 });
                  setIsCategoryOpen(true);
                }}
              >
                <Plus className="size-4 mr-2" /> Add Category
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Category Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Target Role</TableHead>
                    <TableHead>Subcategories</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Loading categories...
                      </TableCell>
                    </TableRow>
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No categories created yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((cat) => (
                      <React.Fragment key={cat.id}>
                        <TableRow className="bg-muted/20 font-semibold">
                          <TableCell className="text-primary">{cat.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{cat.slug}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{cat.targetRole}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {cat.subcategories?.length || 0} subcategories
                          </TableCell>
                          <TableCell>
                            {cat.isActive ? <Badge className="bg-emerald-600">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingCategory(cat);
                                setIsCategoryOpen(true);
                              }}
                            >
                              <Edit2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {cat.subcategories?.map((sub) => (
                          <TableRow key={sub.id} className="pl-6">
                            <TableCell className="pl-8 text-sm">└─ {sub.name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{sub.slug}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize text-[10px]">{sub.targetRole}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">Subcategory</TableCell>
                            <TableCell>
                              {sub.isActive ? <Badge className="bg-emerald-600 text-[10px]">Active</Badge> : <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingCategory(sub);
                                  setIsCategoryOpen(true);
                                }}
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory?.id ? "Edit Category" : "Add Support Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-1 block">Category Name</label>
              <Input
                value={editingCategory?.name || ""}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Target Role</label>
              <Select
                value={editingCategory?.targetRole || "both"}
                onValueChange={(val: any) => setEditingCategory({ ...editingCategory, targetRole: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both (Rider & Driver)</SelectItem>
                  <SelectItem value="rider">Rider Only</SelectItem>
                  <SelectItem value="driver">Driver Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Description</label>
              <Textarea
                value={editingCategory?.description || ""}
                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryOpen(false)}>Cancel</Button>
              <Button type="submit">Save Category</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* FAQ Dialog */}
      <Dialog open={isFaqOpen} onOpenChange={setIsFaqOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFaq?.id ? "Edit FAQ Article" : "Create FAQ Article"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveFaq} className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-1 block">Category</label>
              <Select
                value={editingFaq?.categoryId || ""}
                onValueChange={(val) => setEditingFaq({ ...editingFaq, categoryId: val })}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Target Role</label>
              <Select
                value={editingFaq?.targetRole || "both"}
                onValueChange={(val: any) => setEditingFaq({ ...editingFaq, targetRole: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both (Rider & Driver)</SelectItem>
                  <SelectItem value="rider">Rider Only</SelectItem>
                  <SelectItem value="driver">Driver Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Question</label>
              <Input
                value={editingFaq?.question || ""}
                onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Answer (Markdown Supported)</label>
              <Textarea
                value={editingFaq?.answer || ""}
                onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                rows={4}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFaqOpen(false)}>Cancel</Button>
              <Button type="submit">Save FAQ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
