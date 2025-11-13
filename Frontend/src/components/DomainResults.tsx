import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import DomainSuggestion from "./DomainSuggestion";

interface CheckResponse {
  status: "available" | "unavailable" | "suggestions";
  domain?: string;
  keyword?: string;
  message?: string;
  alternatives?: Array<{ fqdn: string; available: boolean }>; // ✅ Fixed type
  results?: Array<{ fqdn: string; available: boolean }>;
}

interface DomainResultsProps {
  result: CheckResponse;
}

const DomainResults = ({ result }: DomainResultsProps) => {
  // ✅ Available domain
  if (result.status === "available") {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-success/10 rounded-full">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-success mb-2">Domain Available!</h3>
              <p className="text-lg mb-4">
                <span className="font-semibold">{result.domain ?? "This domain"}</span> is ready to register
              </p>
              {result.domain && (
                <a
                  href={`https://www.namecheap.com/domains/registration/results/?domain=${result.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2 bg-success text-success-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Register Now →
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ✅ Unavailable domain
  if (result.status === "unavailable") {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-destructive mb-2">Domain Unavailable</h3>
                <p className="text-lg">
                  {result.domain ? (
                    <>
                      <span className="font-semibold">{result.domain}</span> is already registered.
                    </>
                  ) : (
                    "The domain you searched is already registered."
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Show alternatives if available */}
        {result.alternatives && result.alternatives.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                <CardTitle>AI-Powered Alternatives</CardTitle>
              </div>
              <CardDescription>
                Here are some available alternatives we found for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {result.alternatives.map((altObj, index) => (
                  <DomainSuggestion 
                    key={`${altObj.fqdn}-${index}`} 
                    domain={altObj.fqdn}
                    available={altObj.available}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>No similar domain alternatives found — try a different name.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ✅ Brand name suggestions
  if (result.status === "suggestions" && result.results) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <CardTitle>
              Domain Suggestions{result.keyword ? ` for "${result.keyword}"` : ""}
            </CardTitle>
          </div>
          <CardDescription>
            AI-generated domain ideas based on your brand name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {result.results.map((item) => (
              <DomainSuggestion
                key={item.fqdn}
                domain={item.fqdn}
                available={item.available}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default DomainResults;