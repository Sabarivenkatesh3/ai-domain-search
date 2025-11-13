import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NotificationFormProps {
  domain: string;
  apiBaseUrl: string;
}

const NotificationForm = ({ domain, apiBaseUrl }: NotificationFormProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: domain,
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to subscribe");
      }

      const data = await response.json();
      
      setIsSubscribed(true);
      toast({
        title: "Subscribed successfully! 🎉",
        description: data.message || `You'll be notified when ${domain} becomes available`,
      });
      
      setEmail("");
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: "Unable to subscribe for notifications. Please try again.",
        variant: "destructive",
      });
      console.error("Error subscribing:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-success">
            <Check className="w-6 h-6" />
            <div>
              <p className="font-semibold">You're all set!</p>
              <p className="text-sm text-muted-foreground">
                We'll email you when {domain} becomes available
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <CardTitle>Get Notified</CardTitle>
        </div>
        <CardDescription>
          Want this domain? We'll email you when <span className="font-semibold">{domain}</span> becomes available
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Notify Me
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NotificationForm;
