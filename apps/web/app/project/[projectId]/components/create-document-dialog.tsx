"use client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Textarea } from "@workspace/ui/components/textarea";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"


export function CreateDocumentDialog({projectId}: {projectId: Id<"projects">}) {
  const createDocument = useMutation(api.requirements.documents.create);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<Doc<"documents">["type"]>("TEXT");
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Invalid title");
      return;
    }

    setIsLoading(true);
    await createDocument({
     projectId,
     title:title.trim(),
     description:description.trim(),
     type,
    });
    setIsLoading(false);

    setOpen(false);
    setTitle("");
    setDescription("");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form>
        <DialogTrigger asChild>
          <Button variant="outline">
            New Document
            <HugeiconsIcon icon={Add01Icon} />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              This action will create a new document for your project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Document Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What is this document for?"
                onChange={(e) => setDescription(e.target.value)}
                value={description}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="description">Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as Doc<"documents">["type"])} defaultValue={type}>
                <SelectTrigger className="w-full max-w-48">
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Document Type</SelectLabel>
                    <SelectItem value="TEXT">Text</SelectItem>
                    <SelectItem value="CANVAS">Canvas</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}




