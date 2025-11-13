import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Copy, ExternalLink, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DomainObject {
  fqdn: string;
  available?: boolean;
}

interface DomainSuggestionProps {
  domain: string | DomainObject;
  available?: boolean;
}

const DomainSuggestion = ({ domain, available }: DomainSuggestionProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // ✅ Safely extract the actual domain name
  const domainName =
    typeof domain === "string"
      ? domain
      : typeof domain === "object" && domain !== null
      ? domain.fqdn
      : "";

  const isAvailable =
    available ??
    (typeof domain === "object" && domain !== null ? domain.available : true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(domainName);
      setCopied(true);
      toast({
        title: "Copied!",
        description: `${domainName} copied to clipboard`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (!domainName) return null; // prevents rendering invalid data

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:shadow-md",
        isAvailable
          ? "bg-success/5 border-success/20 hover:border-success/40"
          : "bg-muted/50 border-border"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isAvailable ? (
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}

        <span className="font-mono font-medium text-lg truncate">
          {domainName}
        </span>

        {isAvailable && (
          <span className="px-2 py-0.5 bg-success/20 text-success text-xs font-semibold rounded-full flex-shrink-0">
            Available
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 ml-4">
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>

        {isAvailable && (
          <Button variant="default" size="sm" asChild className="h-8">
            <a
              href={`https://www.namecheap.com/domains/registration/results/?domain=${domainName}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Register
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};

export default DomainSuggestion;
