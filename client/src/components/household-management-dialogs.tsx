import { useEffect, useState } from "react";
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
  type Individual,
  type Corporation,
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

  // Optional account type selection when creating individual or corporation
  const [individualAccountType, setIndividualAccountType] = useState<string>("");
  const [corporateAccountType, setCorporateAccountType] = useState<string>("");
  
  // Risk percentage state for individual creation with account
  const [individualRiskMedium, setIndividualRiskMedium] = useState<number>(0);
  const [individualRiskMediumHigh, setIndividualRiskMediumHigh] = useState<number>(0);
  const [individualRiskHigh, setIndividualRiskHigh] = useState<number>(0);
  
  // Risk percentage state for corporation creation with account
  const [corporateRiskMedium, setCorporateRiskMedium] = useState<number>(0);
  const [corporateRiskMediumHigh, setCorporateRiskMediumHigh] = useState<number>(0);
  const [corporateRiskHigh, setCorporateRiskHigh] = useState<number>(0);

  // Reset account type selections and risk percentages when dialog closes
  useEffect(() => {
    if (dialogType !== "individual") {
      setIndividualAccountType("");
      setIndividualRiskMedium(0);
      setIndividualRiskMediumHigh(0);
      setIndividualRiskHigh(0);
    }
    if (dialogType !== "corporation") {
      setCorporateAccountType("");
      setCorporateRiskMedium(0);
      setCorporateRiskMediumHigh(0);
      setCorporateRiskHigh(0);
    }
  }, [dialogType]);

  // Individual form
  const individualForm = useForm<InsertIndividual>({
    resolver: zodResolver(insertIndividualSchema),
    defaultValues: {
      householdId: "",
      name: "",
      dateOfBirth: undefined,
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
  const individualAccountForm = useForm({
    resolver: zodResolver(insertIndividualAccountSchema),
    defaultValues: {
      individualId: "",
      type: "cash" as const,
      nickname: undefined,
      balance: 0,
      riskMediumPct: 0,
      riskMediumHighPct: 0,
      riskHighPct: 0,
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
  const corporateAccountForm = useForm({
    resolver: zodResolver(insertCorporateAccountSchema),
    defaultValues: {
      corporationId: "",
      type: "cash" as const,
      nickname: undefined,
      balance: 0,
      riskMediumPct: 0,
      riskMediumHighPct: 0,
      riskHighPct: 0,
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
  const jointAccountForm = useForm({
    resolver: zodResolver(insertJointAccountSchema),
    defaultValues: {
      householdId: "",
      type: "joint_cash" as const,
      nickname: undefined,
      balance: 0,
      riskMediumPct: 0,
      riskMediumHighPct: 0,
      riskHighPct: 0,
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
    mutationFn: async (data: InsertIndividual) => {
      const response = await apiRequest("POST", "/api/individuals", data);
      const individual = await response.json() as Individual;
      
      // Create the account with risk percentages
      await apiRequest("POST", "/api/individual-accounts", {
        individualId: individual.id,
        type: individualAccountType,
        riskMediumPct: individualRiskMedium,
        riskMediumHighPct: individualRiskMediumHigh,
        riskHighPct: individualRiskHigh,
      });
      
      return individual;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Individual and account created successfully" });
      onClose();
      individualForm.reset();
      setIndividualAccountType("");
      setIndividualRiskMedium(0);
      setIndividualRiskMediumHigh(0);
      setIndividualRiskHigh(0);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create individual", variant: "destructive" });
    },
  });

  const createCorporationMutation = useMutation({
    mutationFn: async (data: InsertCorporation) => {
      const response = await apiRequest("POST", "/api/corporations", data);
      const corporation = await response.json() as Corporation;
      
      // Create the account with risk percentages
      await apiRequest("POST", "/api/corporate-accounts", {
        corporationId: corporation.id,
        type: corporateAccountType,
        riskMediumPct: corporateRiskMedium,
        riskMediumHighPct: corporateRiskMediumHigh,
        riskHighPct: corporateRiskHigh,
      });
      
      return corporation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({ title: "Success", description: "Corporation and account created successfully" });
      onClose();
      corporationForm.reset();
      setCorporateAccountType("");
      setCorporateRiskMedium(0);
      setCorporateRiskMediumHigh(0);
      setCorporateRiskHigh(0);
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
            <DialogDescription>Add a new individual and account to this household.</DialogDescription>
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
                      <Input 
                        placeholder="John Smith" 
                        data-testid="input-individual-name" 
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            onClose();
                          }
                        }}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Type</label>
                <Select value={individualAccountType} onValueChange={setIndividualAccountType}>
                  <SelectTrigger data-testid="select-individual-account-type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="fhsa">FHSA</SelectItem>
                    <SelectItem value="liff">LIF</SelectItem>
                    <SelectItem value="lira">LIRA</SelectItem>
                    <SelectItem value="rif">RIF</SelectItem>
                    <SelectItem value="rrsp">RRSP</SelectItem>
                    <SelectItem value="tfsa">TFSA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Risk Category Section */}
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Category (Required)</span>
                  <span className="text-xs text-muted-foreground">
                    Total: {individualRiskMedium + individualRiskMediumHigh + individualRiskHigh}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Medium %</label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      data-testid="input-ind-risk-medium"
                      value={individualRiskMedium}
                      onChange={(e) => setIndividualRiskMedium(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Med-High %</label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      data-testid="input-ind-risk-medium-high"
                      value={individualRiskMediumHigh}
                      onChange={(e) => setIndividualRiskMediumHigh(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">High %</label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      data-testid="input-ind-risk-high"
                      value={individualRiskHigh}
                      onChange={(e) => setIndividualRiskHigh(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Risk percentages must sum to 100%</p>
              </div>

              {individualAccountType === "rif" && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <FormField
                    control={individualForm.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            data-testid="input-individual-dob" 
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={individualForm.control}
                    name="spouseDateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spouse Date of Birth <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            data-testid="input-spouse-dob" 
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">If spouse is younger, their age can be used for RIF minimum withdrawals</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-submit" 
                  disabled={
                    createIndividualMutation.isPending || 
                    !individualAccountType || 
                    individualAccountType === "none" ||
                    (individualRiskMedium + individualRiskMediumHigh + individualRiskHigh) !== 100
                  }
                >
                  {createIndividualMutation.isPending ? "Creating..." : "Create Individual & Account"}
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
            <DialogDescription>Add a new corporation and account to this household.</DialogDescription>
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Type</label>
                <Select value={corporateAccountType} onValueChange={setCorporateAccountType}>
                  <SelectTrigger data-testid="select-corporate-account-type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="ipp">IPP (Individual Pension Plan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Risk Category Section */}
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Category (Required)</span>
                  <span className="text-xs text-muted-foreground">
                    Total: {corporateRiskMedium + corporateRiskMediumHigh + corporateRiskHigh}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Medium %</label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      data-testid="input-corp-risk-medium"
                      value={corporateRiskMedium}
                      onChange={(e) => setCorporateRiskMedium(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Med-High %</label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      data-testid="input-corp-risk-medium-high"
                      value={corporateRiskMediumHigh}
                      onChange={(e) => setCorporateRiskMediumHigh(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">High %</label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      data-testid="input-corp-risk-high"
                      value={corporateRiskHigh}
                      onChange={(e) => setCorporateRiskHigh(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Risk percentages must sum to 100%</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-submit" 
                  disabled={
                    createCorporationMutation.isPending || 
                    !corporateAccountType || 
                    corporateAccountType === "none" ||
                    (corporateRiskMedium + corporateRiskMediumHigh + corporateRiskHigh) !== 100
                  }
                >
                  {createCorporationMutation.isPending ? "Creating..." : "Create Corporation & Account"}
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
                        <SelectItem value="liff">LIF</SelectItem>
                        <SelectItem value="rif">RIF</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={individualAccountForm.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Vanguard Personal" 
                        data-testid="input-account-nickname" 
                        {...field} 
                        value={field.value ?? ""} 
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Risk Category Section */}
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Category (Required)</span>
                  <span className="text-xs text-muted-foreground">
                    Total: {(Number(individualAccountForm.watch("riskMediumPct") || 0) + 
                            Number(individualAccountForm.watch("riskMediumHighPct") || 0) + 
                            Number(individualAccountForm.watch("riskHighPct") || 0))}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={individualAccountForm.control}
                    name="riskMediumPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Medium %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            data-testid="input-risk-medium"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={individualAccountForm.control}
                    name="riskMediumHighPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Med-High %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            data-testid="input-risk-medium-high"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={individualAccountForm.control}
                    name="riskHighPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">High %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            data-testid="input-risk-high"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Risk percentages must sum to 100%</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-submit" 
                  disabled={
                    createIndividualAccountMutation.isPending ||
                    (Number(individualAccountForm.watch("riskMediumPct") || 0) + 
                     Number(individualAccountForm.watch("riskMediumHighPct") || 0) + 
                     Number(individualAccountForm.watch("riskHighPct") || 0)) !== 100
                  }
                >
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
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Corporate Cash" 
                        data-testid="input-account-nickname" 
                        {...field} 
                        value={field.value ?? ""} 
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Risk Category Section */}
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Category (Required)</span>
                  <span className="text-xs text-muted-foreground">
                    Total: {(Number(corporateAccountForm.watch("riskMediumPct") || 0) + 
                            Number(corporateAccountForm.watch("riskMediumHighPct") || 0) + 
                            Number(corporateAccountForm.watch("riskHighPct") || 0))}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={corporateAccountForm.control}
                    name="riskMediumPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Medium %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            data-testid="input-risk-medium"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={corporateAccountForm.control}
                    name="riskMediumHighPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Med-High %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            data-testid="input-risk-medium-high"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={corporateAccountForm.control}
                    name="riskHighPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">High %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            data-testid="input-risk-high"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Risk percentages must sum to 100%</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-submit" 
                  disabled={
                    createCorporateAccountMutation.isPending ||
                    (Number(corporateAccountForm.watch("riskMediumPct") || 0) + 
                     Number(corporateAccountForm.watch("riskMediumHighPct") || 0) + 
                     Number(corporateAccountForm.watch("riskHighPct") || 0)) !== 100
                  }
                >
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
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Kids Education Fund" 
                        data-testid="input-account-nickname" 
                        {...field} 
                        value={field.value ?? ""} 
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Risk Category Section */}
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk Category (Required)</span>
                  <span className="text-xs text-muted-foreground">
                    Total: {(Number(jointAccountForm.watch("riskMediumPct") || 0) + 
                            Number(jointAccountForm.watch("riskMediumHighPct") || 0) + 
                            Number(jointAccountForm.watch("riskHighPct") || 0))}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={jointAccountForm.control}
                    name="riskMediumPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Medium %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            data-testid="input-risk-medium"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={jointAccountForm.control}
                    name="riskMediumHighPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Med-High %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            data-testid="input-risk-medium-high"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={jointAccountForm.control}
                    name="riskHighPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">High %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            data-testid="input-risk-high"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Risk percentages must sum to 100%</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  data-testid="button-submit" 
                  disabled={
                    createJointAccountMutation.isPending ||
                    (Number(jointAccountForm.watch("riskMediumPct") || 0) + 
                     Number(jointAccountForm.watch("riskMediumHighPct") || 0) + 
                     Number(jointAccountForm.watch("riskHighPct") || 0)) !== 100
                  }
                >
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
