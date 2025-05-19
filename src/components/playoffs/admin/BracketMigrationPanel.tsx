
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayoffBracket } from "@/types";
import { BracketMigrationService } from "@/services/brackets/migration/BracketMigrationService";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Check, RefreshCw } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

interface BracketMigrationPanelProps {
  onComplete: () => void;
}

const BracketMigrationPanel: React.FC<BracketMigrationPanelProps> = ({ onComplete }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [brackets, setBrackets] = useState<PlayoffBracket[]>([]);
  const [results, setResults] = useState<{ 
    id: string; 
    name: string;
    success: boolean; 
    message: string 
  }[]>([]);
  
  // Fetch brackets that need migration
  const fetchBracketsForMigration = async () => {
    setLoading(true);
    try {
      const brackets = await BracketMigrationService.getBracketsForMigration();
      setBrackets(brackets);
      
      if (brackets.length === 0) {
        toast({
          title: "No brackets to migrate",
          description: "All brackets are already using the new format."
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error fetching brackets",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Migrate a single bracket
  const migrateBracket = async (bracketId: string, bracketName: string) => {
    setMigrating(true);
    try {
      const result = await BracketMigrationService.migrateBracket(bracketId);
      setResults(prev => [...prev, { 
        id: bracketId, 
        name: bracketName,
        success: result.success, 
        message: result.message 
      }]);
      
      if (result.success) {
        toast({
          title: "Migration successful",
          description: `Bracket "${bracketName}" was migrated successfully.`
        });
        setBrackets(prev => prev.filter(b => b.id !== bracketId));
      } else {
        toast({
          variant: "destructive",
          title: "Migration failed",
          description: result.message
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Migration error",
        description: error.message
      });
    } finally {
      setMigrating(false);
    }
  };
  
  // Migrate all brackets
  const migrateAllBrackets = async () => {
    setMigrating(true);
    try {
      const result = await BracketMigrationService.migrateAllBrackets();
      
      const newResults = result.results.map(r => {
        const bracket = brackets.find(b => b.id === r.id);
        return {
          id: r.id,
          name: bracket?.name || "Unknown bracket",
          success: r.success,
          message: r.message
        };
      });
      
      setResults(newResults);
      setBrackets([]); // All brackets should be migrated now
      
      toast({
        title: "Migration complete",
        description: `${result.successful} brackets migrated successfully, ${result.failed} failed.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Migration error",
        description: error.message
      });
    } finally {
      setMigrating(false);
    }
  };
  
  // Rollback a migration
  const rollbackMigration = async (bracketId: string, bracketName: string) => {
    setMigrating(true);
    try {
      const result = await BracketMigrationService.rollbackMigration(bracketId);
      
      if (result.success) {
        toast({
          title: "Rollback successful",
          description: `Migration for "${bracketName}" was rolled back.`
        });
        
        // Update results
        setResults(prev => 
          prev.filter(r => r.id !== bracketId)
        );
        
        // Re-fetch brackets
        fetchBracketsForMigration();
      } else {
        toast({
          variant: "destructive",
          title: "Rollback failed",
          description: result.message
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Rollback error",
        description: error.message
      });
    } finally {
      setMigrating(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bracket Migration Tool</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchBracketsForMigration}
            disabled={loading || migrating}
          >
            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Scan for brackets
          </Button>
          <Button 
            onClick={onComplete} 
            variant="ghost"
          >
            Close
          </Button>
        </div>
      </div>
      
      <Alert>
        <AlertCircle className="h-4 w-4 mr-2" />
        <AlertDescription>
          This tool will migrate brackets from the old custom format to the new brackets-manager format.
          Migrated brackets will keep all their matches and teams intact.
        </AlertDescription>
      </Alert>
      
      {brackets.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium">Brackets to Migrate ({brackets.length})</h4>
            <Button 
              onClick={migrateAllBrackets} 
              disabled={migrating || brackets.length === 0}
            >
              {migrating ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Migrate All
            </Button>
          </div>
          
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brackets.map(bracket => (
                  <TableRow key={bracket.id}>
                    <TableCell className="font-medium">{bracket.name}</TableCell>
                    <TableCell>{bracket.format}</TableCell>
                    <TableCell>{bracket.division || "None"}</TableCell>
                    <TableCell>
                      {bracket.created_at 
                        ? new Date(bracket.created_at).toLocaleDateString() 
                        : "N/A"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => migrateBracket(bracket.id, bracket.name)}
                        disabled={migrating}
                      >
                        {migrating ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                          "Migrate"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium">Migration Results</h4>
          
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bracket</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(result => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">{result.name}</TableCell>
                    <TableCell>
                      {result.success ? (
                        <div className="flex items-center">
                          <Check className="text-green-500 mr-1 h-4 w-4" />
                          <span>Success</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <AlertCircle className="text-red-500 mr-1 h-4 w-4" />
                          <span>Failed</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{result.message}</TableCell>
                    <TableCell className="text-right">
                      {result.success && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => rollbackMigration(result.id, result.name)}
                          disabled={migrating}
                        >
                          {migrating ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                          ) : (
                            "Rollback"
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      {!loading && brackets.length === 0 && results.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-muted-foreground">
            Click "Scan for brackets" to find brackets that need migration.
          </p>
        </div>
      )}
    </div>
  );
};

export default BracketMigrationPanel;
