import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Share2, UserMinus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HouseholdShare {
  id: string;
  householdId: string;
  sharedWithUserId: string;
  accessLevel: "viewer" | "editor";
  sharedAt: string;
  sharedWithUser?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

interface ShareHouseholdDialogProps {
  householdId: string;
  householdName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareHouseholdDialog({
  householdId,
  householdName,
  isOpen,
  onClose,
}: ShareHouseholdDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<"viewer" | "editor">("viewer");

  const { data: shares = [], isLoading: sharesLoading } = useQuery<HouseholdShare[]>({
    queryKey: ["/api/households", householdId, "shares"],
    enabled: isOpen,
  });

  const shareMutation = useMutation({
    mutationFn: async (data: { email: string; accessLevel: "viewer" | "editor" }) => {
      return await apiRequest("POST", `/api/households/${householdId}/shares`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households", householdId, "shares"] });
      toast({
        title: "Success",
        description: `Household shared with ${email}`,
      });
      setEmail("");
      setAccessLevel("viewer");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to share household",
        variant: "destructive",
      });
    },
  });

  const unshareMutation = useMutation({
    mutationFn: async (sharedWithUserId: string) => {
      return await apiRequest("DELETE", `/api/households/${householdId}/shares/${sharedWithUserId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households", householdId, "shares"] });
      toast({
        title: "Success",
        description: "Access removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove access",
        variant: "destructive",
      });
    },
  });

  const handleShare = () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    shareMutation.mutate({ email: email.trim(), accessLevel });
  };

  const formatUserName = (share: HouseholdShare) => {
    if (share.sharedWithUser?.firstName || share.sharedWithUser?.lastName) {
      return `${share.sharedWithUser.firstName || ""} ${share.sharedWithUser.lastName || ""}`.trim();
    }
    return share.sharedWithUser?.email || "Unknown User";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{householdName}"
          </DialogTitle>
          <DialogDescription>
            Share this household with other users so they can view or edit the data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="share-email">Share with</Label>
            <div className="flex gap-2">
              <Input
                id="share-email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                data-testid="input-share-email"
              />
              <Select 
                value={accessLevel} 
                onValueChange={(v) => setAccessLevel(v as "viewer" | "editor")}
              >
                <SelectTrigger className="w-28" data-testid="select-access-level">
                  <SelectValue placeholder="Access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleShare} 
                disabled={shareMutation.isPending}
                data-testid="button-share-submit"
              >
                {shareMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Share"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Viewers can see household data. Editors can also make changes.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Current Access</Label>
            {sharesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                This household is not shared with anyone yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shares.map((share) => (
                    <TableRow key={share.id} data-testid={`row-share-${share.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatUserName(share)}</div>
                          <div className="text-xs text-muted-foreground">
                            {share.sharedWithUser?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={share.accessLevel === "editor" 
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                            : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                          }
                        >
                          {share.accessLevel === "editor" ? "Editor" : "Viewer"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              data-testid={`button-remove-share-${share.id}`}
                            >
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Access</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove access for{" "}
                                <strong>{share.sharedWithUser?.email}</strong>? 
                                They will no longer be able to view this household.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => unshareMutation.mutate(share.sharedWithUserId)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid="button-confirm-remove-share"
                              >
                                Remove Access
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-close-share-dialog">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
