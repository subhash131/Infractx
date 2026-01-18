"use client";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
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
import { toast } from "sonner";
import { Textarea } from "@workspace/ui/components/textarea";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export const CreateRequirementDialog = () => {
  const create = useMutation(api.requirements.file.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Enter a valid name");
      return;
    }
    const { _id } = await create({
      name,
      description,
    });
    router.push(`/requirement/${_id}`);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Create</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Create new project requirements
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                name="project_name"
                placeholder="InsightIQ"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="description">Description(optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="AI Business analyst"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
