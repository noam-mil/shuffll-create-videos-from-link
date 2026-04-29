import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { FileSpreadsheet, Users, Loader2, Upload, X } from "lucide-react";

interface CampaignCsvUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onConfirm: (data: Record<string, string>[]) => Promise<void>;
  isUploading?: boolean;
}

interface CsvRow {
  [key: string]: string;
}

export const CampaignCsvUploadDialog = ({
  open,
  onOpenChange,
  file,
  onConfirm,
  isUploading = false,
}: CampaignCsvUploadDialogProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (file && open) {
      parseCsv(file);
    }
  }, [file, open]);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCsv = async (csvFile: File) => {
    try {
      setParseError(null);
      const text = await csvFile.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        setParseError(t('campaigns.csv.errorMinRows'));
        return;
      }

      const headerLine = lines[0];
      const parsedHeaders = parseCSVLine(headerLine);
      setHeaders(parsedHeaders);

      const parsedRows: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: CsvRow = {};
        parsedHeaders.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        parsedRows.push(row);
      }
      setRows(parsedRows);
    } catch (error) {
      setParseError(t('campaigns.csv.errorParsing'));
    }
  };

  const handleConfirm = async () => {
    if (rows.length === 0) return;
    await onConfirm(rows);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            {t('campaigns.csv.title')}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {t('campaigns.csv.rowCount', { count: rows.length })}
            </span>
            {file && (
              <span className="text-muted-foreground">
                {file.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {parseError ? (
          <div className="py-8 text-center text-destructive">
            <p>{parseError}</p>
          </div>
        ) : (
          <>
            {/* Data Preview Table */}
            <ScrollArea className="flex-1 max-h-[350px] border rounded-lg">
              <div className="min-w-max">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center sticky top-0 bg-background z-10">#</TableHead>
                      {headers.map((header, idx) => (
                        <TableHead key={idx} className="sticky top-0 bg-background z-10 whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {rowIdx + 1}
                        </TableCell>
                        {headers.map((header, colIdx) => (
                          <TableCell key={colIdx} className="whitespace-nowrap">
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 50 && (
                <div className="p-3 text-center text-sm text-muted-foreground border-t">
                  {t('campaigns.csv.showingPreview', { shown: 50, total: rows.length })}
                </div>
              )}
            </ScrollArea>

            {/* Field Mapping Info */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">{t('campaigns.csv.detectedFields')}</h4>
              <div className="flex flex-wrap gap-2">
                {headers.map((header, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {header}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            <X className="w-4 h-4 me-2" />
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={rows.length === 0 || isUploading || !!parseError}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 me-2" />
            )}
            {t('campaigns.csv.upload', { count: rows.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
