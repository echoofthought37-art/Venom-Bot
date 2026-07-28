import { useState, useEffect, useRef } from 'react';
import { useRequestPair, useGetBotStatus, useGetSessionId, useClearSession, getGetBotStatusQueryKey, getGetSessionIdQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepIndicator } from '@/components/step-indicator';
import { CodeDisplay } from '@/components/code-display';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PairingPage() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const requestPairMutation = useRequestPair();
  const clearSessionMutation = useClearSession();

  // Poll bot status when on step 2
  const { data: botStatus } = useGetBotStatus({
    query: {
      enabled: step === 2,
      refetchInterval: step === 2 ? 3000 : false,
      queryKey: getGetBotStatusQueryKey(),
    },
  });

  // Get session ID when connected
  const { data: sessionData } = useGetSessionId({
    query: {
      enabled: step === 3,
      queryKey: getGetSessionIdQueryKey(),
    },
  });

  // Auto-advance to step 3 when connected
  const hasAdvanced = useRef(false);
  useEffect(() => {
    if (step === 2 && botStatus?.connected && !hasAdvanced.current) {
      hasAdvanced.current = true;
      setTimeout(() => {
        setStep(3);
      }, 800);
    }
  }, [botStatus?.connected, step]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || phone.length < 10) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid phone number without the + sign',
        variant: 'destructive',
      });
      return;
    }

    requestPairMutation.mutate(
      { data: { phone } },
      {
        onSuccess: (data) => {
          setPairingCode(data.code);
          setStep(2);
          hasAdvanced.current = false;
        },
        onError: (error: any) => {
          toast({
            title: 'Failed to request pairing code',
            description: error?.message || 'Please try again',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handlePairAnother = () => {
    clearSessionMutation.mutate(undefined, {
      onSuccess: () => {
        setStep(1);
        setPhone('');
        setPairingCode('');
        hasAdvanced.current = false;
        queryClient.invalidateQueries({ queryKey: getGetBotStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSessionIdQueryKey() });
      },
      onError: (error: any) => {
        toast({
          title: 'Failed to clear session',
          description: error?.message || 'Please try again',
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12 slide-up">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-primary rounded-full pulse-glow" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-primary">VENOM</span>
              <span className="text-foreground/90"> MD</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            WhatsApp Bot Pairing Portal
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">by Taprush EMP</p>
        </div>

        <StepIndicator currentStep={step} totalSteps={3} />

        {/* Step 1: Phone Input */}
        {step === 1 && (
          <div className="slide-up space-y-6">
            <div className="bg-card border border-card-border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-2">Link your WhatsApp</h2>
              <p className="text-muted-foreground mb-6">
                Enter your phone number to generate a pairing code
              </p>

              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="2348021016309"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="font-mono text-lg"
                    disabled={requestPairMutation.isPending}
                    data-testid="input-phone"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter country code + number (no + sign or spaces)
                  </p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full font-semibold"
                  disabled={requestPairMutation.isPending || !phone}
                  data-testid="button-get-code"
                >
                  {requestPairMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Code...
                    </>
                  ) : (
                    'Get Pairing Code'
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Step 2: Show Code & Wait for Connection */}
        {step === 2 && (
          <div className="slide-up space-y-6">
            <div className="bg-card border border-card-border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-6">Enter this code in WhatsApp</h2>

              <CodeDisplay code={pairingCode} size="large" />

              <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border">
                <p className="text-sm font-medium mb-3">Instructions:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Open WhatsApp on your phone</li>
                  <li>Go to Settings → Linked Devices</li>
                  <li>Tap "Link a Device"</li>
                  <li>Select "Link with phone number instead"</li>
                  <li>Enter your number: <span className="font-mono text-foreground">{phone}</span></li>
                  <li>Enter the code shown above</li>
                </ol>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3 text-muted-foreground">
                {botStatus?.connected ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-primary">Connected!</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin pulse-glow text-primary" />
                    <span className="text-sm font-medium">Waiting for connection...</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Session ID Revealed */}
        {step === 3 && (
          <div className="slide-up space-y-6">
            <div className="bg-card border border-primary/30 rounded-lg p-8 shadow-xl">
              <div className="flex items-center justify-center gap-3 mb-6">
                <CheckCircle2 className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold text-primary">Connection Successful</h2>
              </div>

              <p className="text-center text-muted-foreground mb-8">
                Your bot is paired. Use this session ID to deploy on Render.
              </p>

              <CodeDisplay 
                code={sessionData?.id || 'Loading...'} 
                label="Session ID" 
                size="large"
              />

              <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-lg">
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>
                    The bot also sent this session ID directly to your WhatsApp.
                  </span>
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-semibold">Deploy to Render</h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-muted-foreground">
                      Fork the{' '}
                      <a 
                        href="https://github.com/taprushEMP/venom-md" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                        data-testid="link-github"
                      >
                        Venom MD GitHub repository
                      </a>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-muted-foreground">
                      Go to{' '}
                      <a 
                        href="https://render.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                        data-testid="link-render"
                      >
                        render.com
                      </a>
                      {' '}→ New Web Service → connect your fork
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
                    <div className="text-muted-foreground space-y-2">
                      <p>Add these environment variables:</p>
                      <div className="space-y-1 font-mono text-xs bg-muted/30 p-3 rounded border border-border">
                        <div><span className="text-primary">SESSION_ID</span> = {sessionData?.id}</div>
                        <div><span className="text-primary">OWNER_NUMBER</span> = {phone}</div>
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">4</span>
                    <span className="text-muted-foreground">
                      Deploy — your bot is now live 24/7
                    </span>
                  </li>
                </ol>
              </div>

              <Button
                onClick={handlePairAnother}
                variant="outline"
                size="lg"
                className="w-full mt-8"
                disabled={clearSessionMutation.isPending}
                data-testid="button-pair-another"
              >
                {clearSessionMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  'Pair Another Number'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
