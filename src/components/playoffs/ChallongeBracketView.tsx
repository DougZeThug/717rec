
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ExternalLink, RefreshCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useToast } from "@/hooks/use-toast";

interface ChallongeBracketProps {
  tournamentId: string;
  tournamentUrl: string;
}

const ChallongeBracketView: React.FC<ChallongeBracketProps> = ({
  tournamentId,
  tournamentUrl,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { isAdminAccessGranted } = useAdminAccess();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("brackets");
  
  // Construct the iframe URL
  const iframeUrl = `https://challonge.com/${tournamentUrl}/module?show_final_results=1&show_standings=1&theme=1&multiplier=1&match_width_multiplier=1&scale_to_fit=1`;
  
  // Function to refresh the iframe
  const refreshIframe = () => {
    setIsLoading(true);
    const iframe = document.getElementById('challonge-bracket') as HTMLIFrameElement;
    if (iframe) {
      iframe.src += '';
    }
    setTimeout(() => setIsLoading(false), 1000);
  };
  
  // Function to open tournament in new tab
  const openInChallonge = () => {
    window.open(`https://challonge.com/${tournamentUrl}`, '_blank');
  };
  
  // Start tournament function - admin only
  const startTournament = async () => {
    if (!isAdminAccessGranted) {
      toast({
        title: "Access Denied",
        description: "Only admins can start tournaments.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      await fetch(`/api/challonge?action=startTournament&tournamentId=${tournamentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      toast({
        title: "Tournament Started",
        description: "The tournament has been started on Challonge.",
      });
      refreshIframe();
    } catch (error) {
      console.error("Error starting tournament:", error);
      toast({
        title: "Start Failed",
        description: "Failed to start the tournament on Challonge.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Bracket Visualization</CardTitle>
          <CardDescription>
            Powered by Challonge
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={refreshIframe} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={openInChallonge}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Open in Challonge
          </Button>
          {isAdminAccessGranted && (
            <Button variant="default" size="sm" onClick={startTournament} disabled={isLoading}>
              Start Tournament
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="brackets" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="brackets">Bracket View</TabsTrigger>
            <TabsTrigger value="standings">Standings</TabsTrigger>
          </TabsList>
          <TabsContent value="brackets" className="w-full">
            <div className="relative w-full rounded-md overflow-hidden" style={{ height: '600px' }}>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading bracket...</p>
                  </div>
                </div>
              )}
              <iframe
                id="challonge-bracket"
                src={iframeUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="auto"
                allowTransparency={true}
                onLoad={() => setIsLoading(false)}
              ></iframe>
            </div>
          </TabsContent>
          <TabsContent value="standings" className="w-full">
            <div className="relative w-full rounded-md overflow-hidden" style={{ height: '600px' }}>
              <iframe
                src={`https://challonge.com/${tournamentUrl}/module?tab=standings&theme=1`}
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="auto"
                allowTransparency={true}
              ></iframe>
            </div>
          </TabsContent>
        </Tabs>
        <div className="mt-4 flex flex-col space-y-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span>If bracket doesn't load, try refreshing or opening in Challonge directly.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Tournament ID: {tournamentId}</Badge>
            <Badge variant="outline">URL: {tournamentUrl}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChallongeBracketView;
