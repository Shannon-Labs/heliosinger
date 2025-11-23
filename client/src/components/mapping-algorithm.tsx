import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const mappingFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  velocity_min: z.number().min(100).max(300),
  velocity_max: z.number().min(600).max(1000),
  midi_note_min: z.number().min(12).max(60),
  midi_note_max: z.number().min(60).max(108),
  density_min: z.number().min(0.1).max(5),
  density_max: z.number().min(10).max(100),
  decay_time_min: z.number().min(0.1).max(1),
  decay_time_max: z.number().min(2).max(10),
  bz_detune_cents: z.number().min(-50).max(50),
  bz_threshold: z.number().min(-20).max(0)
});

type MappingFormData = z.infer<typeof mappingFormSchema>;

export function MappingAlgorithm() {
  const [showEditor, setShowEditor] = useState(false);
  const [testingCondition, setTestingCondition] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active mapping configuration
  const { data: activeMapping, isLoading } = useQuery<{
    id: string;
    name: string;
    velocity_min: number;
    velocity_max: number;
    midi_note_min: number;
    midi_note_max: number;
    density_min: number;
    density_max: number;
    decay_time_min: number;
    decay_time_max: number;
    bz_detune_cents: number;
    bz_threshold: number;
    created_at: string;
    is_active?: string;
  }>({
    queryKey: ["/api/mapping/active"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey.join("/"));
      if (!response.ok) throw new Error("Failed to fetch active mapping");
      return response.json();
    }
  });

  // Test condition mutation
  const testConditionMutation = useMutation({
    mutationFn: async (condition: string) => {
      const response = await apiRequest("POST", "/api/mapping/test-condition", { condition });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: `${data.condition.charAt(0).toUpperCase() + data.condition.slice(1)} Condition Tested`,
        description: `Generated ${data.chord.baseNote} chord with ${data.chord.decayTime}s decay`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test space weather condition",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTestingCondition(null);
    }
  });

  // Update mapping mutation
  const updateMappingMutation = useMutation({
    mutationFn: async (data: MappingFormData) => {
      if (!activeMapping) throw new Error("No active mapping found");
      
      const response = await apiRequest("PATCH", `/api/mapping/configs/${activeMapping.id}`, {
        ...data,
        is_active: "true"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mapping/active"] });
      setShowEditor(false);
      toast({
        title: "Mapping Updated",
        description: "Solar wind to MIDI mapping configuration has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update mapping configuration",
        variant: "destructive",
      });
    }
  });

  const form = useForm<MappingFormData>({
    resolver: zodResolver(mappingFormSchema),
    defaultValues: activeMapping ? {
      name: activeMapping.name,
      velocity_min: activeMapping.velocity_min,
      velocity_max: activeMapping.velocity_max,
      midi_note_min: activeMapping.midi_note_min,
      midi_note_max: activeMapping.midi_note_max,
      density_min: activeMapping.density_min,
      density_max: activeMapping.density_max,
      decay_time_min: activeMapping.decay_time_min,
      decay_time_max: activeMapping.decay_time_max,
      bz_detune_cents: activeMapping.bz_detune_cents,
      bz_threshold: activeMapping.bz_threshold
    } : {
      name: "Custom Mapping",
      velocity_min: 200,
      velocity_max: 800,
      midi_note_min: 36,
      midi_note_max: 84,
      density_min: 0.5,
      density_max: 50.0,
      decay_time_min: 0.2,
      decay_time_max: 5.0,
      bz_detune_cents: -20,
      bz_threshold: -5.0
    }
  });

  const handleTestCondition = (condition: string) => {
    setTestingCondition(condition);
    testConditionMutation.mutate(condition);
  };

  const onSubmit = (data: MappingFormData) => {
    updateMappingMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <section className="mb-8">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!activeMapping) {
    return (
      <section className="mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground mb-4">
              <i className="fas fa-exclamation-triangle text-4xl mb-2" />
              <h3 className="text-lg font-semibold">No Active Mapping Configuration</h3>
              <p className="text-sm">Unable to load the solar wind to MIDI mapping configuration</p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  const configDate = new Date(activeMapping.created_at).toISOString().split('T')[0];

  return (
    <section className="mb-8">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-6">Solar Wind to MIDI Mapping Algorithm</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lookup Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Lookup Table Configuration</h3>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm">
                <div className="text-accent mb-2">// Solar Wind to MIDI Mapping Table</div>
                <div className="text-muted-foreground mb-2">// Date-stamped: {configDate}</div>
                <div className="space-y-1">
                  <div><span className="text-primary">velocity_range:</span> [{activeMapping.velocity_min}, {activeMapping.velocity_max}] <span className="text-muted-foreground">// km/s</span></div>
                  <div><span className="text-primary">midi_range:</span> [{activeMapping.midi_note_min}, {activeMapping.midi_note_max}] <span className="text-muted-foreground">// C2 to C6</span></div>
                  <div><span className="text-accent">density_min:</span> {activeMapping.density_min} <span className="text-muted-foreground">// p/cm³</span></div>
                  <div><span className="text-accent">density_max:</span> {activeMapping.density_max}</div>
                  <div><span className="text-accent">decay_range:</span> [{activeMapping.decay_time_min}, {activeMapping.decay_time_max}] <span className="text-muted-foreground">// seconds</span></div>
                  <div><span className="text-warning">bz_detune:</span> {activeMapping.bz_detune_cents} <span className="text-muted-foreground">// cents when south</span></div>
                  <div><span className="text-warning">beat_threshold:</span> {activeMapping.bz_threshold} <span className="text-muted-foreground">// nT</span></div>
                </div>
              </div>
              
              <Dialog open={showEditor} onOpenChange={setShowEditor}>
                <DialogTrigger asChild>
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    data-testid="button-edit-mapping"
                  >
                    <i className="fas fa-edit mr-2" />
                    Edit Mapping Parameters
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Edit Mapping Configuration</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Configuration Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="velocity_min"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Velocity (km/s)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="velocity_max"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Velocity (km/s)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="midi_note_min"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min MIDI Note</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="midi_note_max"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max MIDI Note</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bz_detune_cents"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bz Detune (cents)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="bz_threshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bz Threshold (nT)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.1" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex space-x-2 pt-4">
                        <Button 
                          type="submit" 
                          disabled={updateMappingMutation.isPending}
                          data-testid="button-save-mapping"
                        >
                          {updateMappingMutation.isPending ? "Saving..." : "Save Configuration"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowEditor(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Algorithm Visualization */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Algorithm Flow</h3>
              <div className="space-y-3">
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-primary mb-1">1. Velocity → Pitch</div>
                  <div className="text-xs text-muted-foreground">Linear mapping from {activeMapping.velocity_min}-{activeMapping.velocity_max} km/s to MIDI notes {activeMapping.midi_note_min}-{activeMapping.midi_note_max}</div>
                </div>
                
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-accent mb-1">2. Density → Envelope</div>
                  <div className="text-xs text-muted-foreground">Logarithmic decay time: low density = long gong, high = short pluck</div>
                </div>
                
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-warning mb-1">3. Bz → Detuning</div>
                  <div className="text-xs text-muted-foreground">Southward field below {activeMapping.bz_threshold} nT creates {activeMapping.bz_detune_cents} cent detune for audible beating</div>
                </div>
                
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="text-sm font-medium mb-1">4. Chord Synthesis</div>
                  <div className="text-xs text-muted-foreground">Combine all parameters into single space weather chord</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Test Different Conditions */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold mb-4">Test Different Space Weather Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="bg-accent/10 border-accent/30 hover:bg-accent/20 p-4 h-auto flex flex-col items-start"
                onClick={() => handleTestCondition('quiet')}
                disabled={testingCondition === 'quiet'}
                data-testid="button-test-quiet"
              >
                <div className="text-accent font-medium mb-1 flex items-center">
                  {testingCondition === 'quiet' && <i className="fas fa-spinner fa-spin mr-2" />}
                  Quiet Conditions
                </div>
                <div className="text-xs text-muted-foreground">Low velocity, normal density, Bz north</div>
              </Button>
              
              <Button
                variant="outline"
                className="bg-warning/10 border-warning/30 hover:bg-warning/20 p-4 h-auto flex flex-col items-start"
                onClick={() => handleTestCondition('moderate')}
                disabled={testingCondition === 'moderate'}
                data-testid="button-test-moderate"
              >
                <div className="text-warning font-medium mb-1 flex items-center">
                  {testingCondition === 'moderate' && <i className="fas fa-spinner fa-spin mr-2" />}
                  Moderate Activity
                </div>
                <div className="text-xs text-muted-foreground">Medium velocity, varied density, mixed Bz</div>
              </Button>
              
              <Button
                variant="outline"
                className="bg-destructive/10 border-destructive/30 hover:bg-destructive/20 p-4 h-auto flex flex-col items-start"
                onClick={() => handleTestCondition('storm')}
                disabled={testingCondition === 'storm'}
                data-testid="button-test-storm"
              >
                <div className="text-destructive font-medium mb-1 flex items-center">
                  {testingCondition === 'storm' && <i className="fas fa-spinner fa-spin mr-2" />}
                  Storm Conditions
                </div>
                <div className="text-xs text-muted-foreground">High velocity, low density, Bz strongly south</div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
