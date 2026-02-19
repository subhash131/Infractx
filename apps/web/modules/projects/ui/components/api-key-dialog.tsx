"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { CopyIcon, PlusIcon, TrashIcon, KeyIcon } from "lucide-react";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyDialog({ open, onOpenChange }: ApiKeyDialogProps) {
  const keys = useQuery(api.api_keys.list);
  const generateKey = useMutation(api.api_keys.generate);
  const revokeKey = useMutation(api.api_keys.revoke);
  
  const [newKeyName, setNewKeyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [justGeneratedKey, setJustGeneratedKey] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const key = await generateKey({ name: newKeyName || "MCP Key" });
      setJustGeneratedKey(key);
      setNewKeyName("");
      toast.success("API Key generated!");
    } catch (e) {
      toast.error("Failed to generate key");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (id: any) => {
    if (!confirm("Are you sure you want to revoke this key? It will stop working immediately.")) return;
    try {
      await revokeKey({ id });
      toast.success("Key revoked");
    } catch (e) {
      toast.error("Failed to revoke key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage API Keys</DialogTitle>
          <DialogDescription>
            Create long-lived keys for connecting your MCP client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* List existing keys */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Your Keys</h4>
            {keys === undefined ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : keys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active keys.</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {keys.map((k) => (
                  <div key={k._id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium truncate">{k.name || "Untitled Key"}</span>
                      <span className="text-xs text-muted-foreground truncate font-mono">
                        {k.key.substring(0, 12)}...
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleRevoke(k._id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generate New */}
          <div className="flex items-end gap-2 pt-4 border-t">
            <div className="grid w-full gap-1.5">
              <label htmlFor="keyName" className="text-xs font-medium">New Key Name</label>
              <Input 
                id="keyName" 
                placeholder="e.g. My Laptop MCP" 
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? "..." : <PlusIcon className="h-4 w-4" />}
            </Button>
          </div>

          {/* Success Display */}
          {justGeneratedKey && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
              <p className="text-xs font-medium text-green-600 mb-1">New Key Generated (Copy now, it won't be shown again!)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background p-2 rounded border font-mono text-xs break-all">
                  {justGeneratedKey}
                </code>
                <Button size="icon" variant="outline" onClick={() => copyToClipboard(justGeneratedKey)}>
                  <CopyIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
