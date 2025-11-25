import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  insertIndividualSchema,
  insertCorporationSchema,
  insertIndividualAccountSchema,
  insertCorporateAccountSchema,
  insertJointAccountSchema,
  type InsertIndividual,
  type InsertCorporation,
  type InsertIndividualAccount,
  type InsertCorporateAccount,
  type InsertJointAccount,
} from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HouseholdManagementDialogsProps {
  householdId: string | null;
  individualId: string | null;
  corporationId: string | null;
  dialogType: "individual" | "corporation" | "individual-account" | "corporate-account" | "joint-account" | null;
  onClose: () => void;
}

export function HouseholdManagementDialogs({
  householdId,
  individualId,
  corporationId,
  dialogType,
  onClose,
}: HouseholdManagementDialogsProps) {
  const { toast } = useToast();


  // Individual form
  const individualForm = useForm<InsertIndividual>({
    resolver: zodResolver(insertIndividualSchema),
    defaultValues: {
      householdId: "",
      name: "",
    },
  });

  // Update form values when householdId changes and reset when dialog closes
  useEffect(() => {
    if (householdId && dialogType === "individual") {
      individualForm.setValue("householdId", householdId);
    } else if (dialogType !== "individual") {
      individualForm.reset();
    }
  }, [householdId, dialogType, individualForm]);

  // Corporation form
  const corporationForm = useForm<InsertCorporation>({
    resolver: zodResolver(insertCorporationSchema),
    defaultValues: {
      householdId: "",
      name: "",
    },
  });

  // Update form values when householdId changes and reset when dialog closes
  useEffect(() => {
    if (householdId && dialogType === "corporation") {
      corporationForm.setValue("householdId", householdId);
    } else if (dialogType !== "corporation") {
      corporationForm.reset();
    }
  }, [householdId, dialogType, corporationForm]);

  // Individual account form
  const individualAccountForm = useForm<InsertIndividualAccount>({
    resolver: zodResolver(insertIndividualAccountSchema),
    defaultValues: {
      individualId: "",
      type: "cash",
      balance: "",
      performance: "",
    },
  });

  // Update form values when individualId changes and reset when dialog closes
  useEffect(() => {
    if (individualId && dialogType === "individual-account") {
      individualAccountForm.setValue("individualId", individualId);
    } else if (dialogType !== "individual-account") {
      individualAccountForm.reset();
    }
  }, [individualId, dialogType, individualAccountForm]);

  // Corporate account form
  const corporateAccountForm = useForm<InsertCorporateAccount>({
    resolver: zodResolver(insertCorporateAccountSchema),
    defaultValues: {
      corporationId: "",
      type: "cash",
      balance: "",
      performance: "",
    },
  });

  // Update form values when corporationId changes and reset when dialog closes
  useEffect(() => {
    if (corporationId && dialogType === "corporate-account") {
      corporateAccountForm.setValue("corporationId", corporationId);
    } else if (dialogType !== "corporate-account") {
      corporateAccountForm.reset();
    }
  }, [corporationId, dialogType, corporateAccountForm]);

  // Joint account form
  const jointAccountForm = useForm<InsertJointAccount>({
    resolver: zodResolver(insertJointAccountSchema),
    defaultValues: {
      householdId: "",
      type: "joint_cash",
      balance: "",
      performance: "",
    },
  });

  // Update form values when householdId changes and reset when dialog closes
  useEffect(() => {
    if (householdId && dialogType === "joint-account") {
      jointAccountForm.setValue("householdId", householdId);
    } else if (dialogType !== "joint-account") {
      jointAccountForm.reset();
    }
  }, [householdId, dialogType, jointAccountForm]);

  // Mutations
  const createIndividualMutation = useMutation({
    mutationFn: async (data: InsertIndividual) => await apiRequest("POST", "/api/individuals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Individual created successfully" });
      onClose();
      individualForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create individual", variant: "destructive" });
    },
  });

  const createCorporationMutation = useMutation({
    mutationFn: async (data: InsertCorporation) => await apiRequest("POST", "/api/corporations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Corporation created successfully" });
      onClose();
      corporationForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create corporation", variant: "destructive" });
    },
  });

  const createIndividualAccountMutation = useMutation({
    mutationFn: async (data: InsertIndividualAccount) => await apiRequest("POST", "/api/individual-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Account created successfully" });
      onClose();
      individualAccountForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create account", variant: "destructive" });
    },
  });

  const createCorporateAccountMutation = useMutation({
    mutationFn: async (data: InsertCorporateAccount) => await apiRequest("POST", "/api/corporate-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Account created successfully" });
      onClose();
      corporateAccountForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create account", variant: "destructive" });
    },
  });

  const createJointAccountMutation = useMutation({
    mutationFn: async (data: InsertJointAccount) => await apiRequest("POST", "/api/joint-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Joint account created successfully" });
      onClose();
      jointAccountForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create joint account", variant: "destructive" });
    },
  });

  return (
    <>
      {/* Individual Dialog */}
      <Dialog open={dialogType === "individual"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Individual</DialogTitle>
            <DialogDescription>Add a new individual to this household.</DialogDescription>
          </DialogHeader>
          <Form {...individualForm}>
            <form onSubmit={individualForm.handleSubmit((data) => createIndividualMutation.mutate(data))} className="space-y-4">
              <FormField
                control={individualForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" data-testid="input-individual-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createIndividualMutation.isPending}>
                  {createIndividualMutation.isPending ? "Creating..." : "Create Individual"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Corporation Dialog */}
      <Dialog open={dialogType === "corporation"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Corporation</DialogTitle>
            <DialogDescription>Add a new corporation to this household.</DialogDescription>
          </DialogHeader>
          <Form {...corporationForm}>
            <form onSubmit={corporationForm.handleSubmit((data) => createCorporationMutation.mutate(data))} className="space-y-4">
              <FormField
                control={corporationForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith Corp" data-testid="input-corporation-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createCorporationMutation.isPending}>
                  {createCorporationMutation.isPending ? "Creating..." : "Create Corporation"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Individual Account Dialog */}
      <Dialog open={dialogType === "individual-account"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>Add a new account for this individual.</DialogDescription>
          </DialogHeader>
          <Form {...individualAccountForm}>
            <form onSubmit={individualAccountForm.handleSubmit((data) => createIndividualAccountMutation.mutate(data))} className="space-y-4">
              <FormField
                control={individualAccountForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-account-type">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="tfsa">TFSA</SelectItem>
                        <SelectItem value="fhsa">FHSA</SelectItem>
                        <SelectItem value="rrsp">RRSP</SelectItem>
                        <SelectItem value="lira">LIRA</SelectItem>
                        <SelectItem value="liff">LIFF</SelectItem>
                        <SelectItem value="rif">RIF</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={individualAccountForm.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Balance (CAD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="50000.00" data-testid="input-balance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={individualAccountForm.control}
                name="performance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Performance (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="8.5" data-testid="input-performance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createIndividualAccountMutation.isPending}>
                  {createIndividualAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Corporate Account Dialog */}
      <Dialog open={dialogType === "corporate-account"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>Add a new account for this corporation.</DialogDescription>
          </DialogHeader>
          <Form {...corporateAccountForm}>
            <form onSubmit={corporateAccountForm.handleSubmit((data) => createCorporateAccountMutation.mutate(data))} className="space-y-4">
              <FormField
                control={corporateAccountForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-account-type">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="ipp">IPP (Individual Pension Plan)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={corporateAccountForm.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Balance (CAD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="100000.00" data-testid="input-balance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={corporateAccountForm.control}
                name="performance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Performance (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="8.5" data-testid="input-performance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createCorporateAccountMutation.isPending}>
                  {createCorporateAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Joint Account Dialog */}
      <Dialog open={dialogType === "joint-account"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Joint Account</DialogTitle>
            <DialogDescription>Add a new joint account to this household.</DialogDescription>
          </DialogHeader>
          <Form {...jointAccountForm}>
            <form onSubmit={jointAccountForm.handleSubmit((data) => createJointAccountMutation.mutate(data))} className="space-y-4">
              <FormField
                control={jointAccountForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-joint-account-type">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="joint_cash">Joint Cash</SelectItem>
                        <SelectItem value="resp">RESP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={jointAccountForm.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Balance (CAD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="75000.00" data-testid="input-balance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={jointAccountForm.control}
                name="performance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Performance (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="8.5" data-testid="input-performance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createJointAccountMutation.isPending}>
                  {createJointAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
