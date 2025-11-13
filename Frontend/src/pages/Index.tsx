import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Github, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DomainResults from "@/components/DomainResults";
import NotificationForm from "@/components/NotificationForm";

const API_BASE_URL = "http://127.0.0.1:8000";

interface CheckResponse {
  status: "available" | "unavailable" | "suggestions";
  domain?: string;
  keyword?: string;
  message?: string;
  alternatives?: Array<{ fqdn: string; available: boolean }>; // ✅ Fixed type
  results?: Array<{ fqdn: string; available: boolean }>;
  allow_notification?: boolean;
}

const Index = () => {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null);
  const { toast } = useToast();

  const handleCheck = async () => {
    if (!inputValue.trim()) {
      toast({
        title: "Input required",
        description: "Please enter a domain name or brand keyword",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setCheckResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input_text: inputValue.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to check domain");
      }

      const data: CheckResponse = await response.json();

      // ✅ Validate response to avoid blank screen
      if (!data || !data.status) {
        throw new Error("Invalid response from backend");
      }

      setCheckResult(data);

      // ✅ Handle available domains
      if (data.status === "available") {
        toast({
          title: "Domain available! 🎉",
          description: `${data.domain} is ready to register!`,
        });
      }
      // ✅ Handle unavailable domains
      else if (data.status === "unavailable") {
        toast({
          title: "Domain unavailable 😕",
          description:
            data.alternatives && data.alternatives.length > 0
              ? "But here are some alternatives you can try!"
              : "No similar domains found — try another keyword.",
          variant: "destructive",
        });
      }
      // ✅ Handle AI suggestion mode
      else if (data.status === "suggestions") {
        toast({
          title: "AI Suggestions ✨",
          description: "Here are some domains inspired by your brand name.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          "Failed to check domain. Make sure your Flask backend is running.",
        variant: "destructive",
      });
      console.error("Error checking domain:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCheck();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary/30 to-background">
      <main className="flex-1 container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm text-primary font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              AI-Powered Domain Search
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Domain Suggester AI
            </h1>
            <p className="text-lg text-muted-foreground">
              Find the perfect domain for your brand instantly with AI-powered
              suggestions
            </p>
          </div>

          {/* Main Search Card */}
          <Card className="shadow-xl border-2">
            <CardHeader>
              <CardTitle>Check Domain Availability</CardTitle>
              <CardDescription>
                Enter a full domain (e.g., socialeagle.com) or a brand name to
                get suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter domain or brand name..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 text-lg h-12"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleCheck}
                  disabled={isLoading}
                  size="lg"
                  className="px-6"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Check
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ✅ Results UI */}
          {checkResult && (
            <div className="animate-slide-up space-y-6">
              <DomainResults result={checkResult} />

              {/* Notification form */}
              {checkResult.allow_notification && checkResult.domain && (
                <NotificationForm
                  domain={checkResult.domain}
                  apiBaseUrl={API_BASE_URL}
                />
              )}
            </div>
          )}

          {/* Empty State */}
          {!checkResult && !isLoading && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Enter a domain or brand name above to get started</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Built with ❤️ by{" "}
              <span className="font-semibold text-foreground">Sabari</span>
            </p>
            <a
              href="https://github.com/Sabarivenkatesh3/ai-domain-search"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;