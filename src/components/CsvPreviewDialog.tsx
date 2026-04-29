import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  FileSpreadsheet, 
  Users, 
  Play, 
  Check, 
  Loader2, 
  AlertCircle,
  X,
  CheckCircle2,
  XCircle,
  Send
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import birthdayP1 from "@/assets/birthday-p1.jpg";
import birthdayP2 from "@/assets/birthday-p2.jpg";
import birthdayP3 from "@/assets/birthday-p3.jpg";
import achievementP1 from "@/assets/achievement-p1.jpg";
import achievementP2 from "@/assets/achievement-p2.jpg";
import achievementP3 from "@/assets/achievement-p3.jpg";
import holidayP1 from "@/assets/holiday-p1.jpg";
import holidayP2 from "@/assets/holiday-p2.jpg";
import holidayP3 from "@/assets/holiday-p3.jpg";
import birthP1 from "@/assets/birth-p1.jpg";
import birthP2 from "@/assets/birth-p2.jpg";
import birthP3 from "@/assets/birth-p3.jpg";

const templateCategories = {
  recent: {
    label: "נוצרו לאחרונה",
    templates: [
      { id: "r1", title: "ברכה ליום הולדת", thumbnail: birthdayP1, category: "יום הולדת" },
      { id: "r2", title: "חגיגת קידום", thumbnail: achievementP2, category: "הישג" },
      { id: "r3", title: "ברכת חג", thumbnail: holidayP3, category: "חג" },
    ]
  },
  birthday: {
    label: "ימי הולדת 🎂",
    templates: [
      { id: "b1", title: "ברכה צבעונית", thumbnail: birthdayP1, category: "יום הולדת" },
      { id: "b2", title: "ברכה אלגנטית", thumbnail: birthdayP2, category: "יום הולדת" },
      { id: "b3", title: "ברכה קבוצתית", thumbnail: birthdayP3, category: "יום הולדת" },
    ]
  },
  holiday: {
    label: "חגים ומועדים 🎉",
    templates: [
      { id: "h1", title: "ברכת ראש השנה", thumbnail: holidayP1, category: "חג" },
      { id: "h2", title: "ברכת שנה חדשה", thumbnail: holidayP2, category: "חג" },
      { id: "h3", title: "ברכת חג חורף", thumbnail: holidayP3, category: "חג" },
    ]
  },
  birth: {
    label: "לידת בן/בת 👶",
    templates: [
      { id: "n1", title: "ברכה לתינוק", thumbnail: birthP1, category: "לידה" },
      { id: "n2", title: "ברכה לתינוקת", thumbnail: birthP2, category: "לידה" },
      { id: "n3", title: "חגיגת הורות", thumbnail: birthP3, category: "לידה" },
    ]
  },
  achievement: {
    label: "הישגים 🏆",
    templates: [
      { id: "a1", title: "חגיגת קידום", thumbnail: achievementP1, category: "הישג" },
      { id: "a2", title: "הישג מרשים", thumbnail: achievementP2, category: "הישג" },
      { id: "a3", title: "סיום פרויקט", thumbnail: achievementP3, category: "הישג" },
    ]
  },
};

interface CsvPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
}

interface CsvRow {
  [key: string]: string;
}

interface GenerationStatus {
  index: number;
  status: "pending" | "generating" | "completed" | "error";
  name: string;
}

export const CsvPreviewDialog = ({
  open,
  onOpenChange,
  file,
}: CsvPreviewDialogProps) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatuses, setGenerationStatuses] = useState<GenerationStatus[]>([]);
  const [progress, setProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof templateCategories>("recent");
  const [confirmedRows, setConfirmedRows] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const allCompleted = generationStatuses.length > 0 && generationStatuses.every(s => s.status === "completed");

  const handleConfirmRow = (rowIdx: number, confirmed: boolean) => {
    setConfirmedRows(prev => {
      const newSet = new Set(prev);
      if (confirmed) {
        newSet.add(rowIdx);
      } else {
        newSet.delete(rowIdx);
      }
      return newSet;
    });
  };

  const handleConfirmAll = () => {
    if (confirmedRows.size === rows.length) {
      setConfirmedRows(new Set());
    } else {
      setConfirmedRows(new Set(rows.map((_, idx) => idx)));
    }
  };

  useEffect(() => {
    if (file && open) {
      parseCsv(file);
    }
  }, [file, open]);

  const parseCsv = async (csvFile: File) => {
    try {
      const text = await csvFile.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "שגיאה בקובץ",
          description: "הקובץ חייב להכיל לפחות שורת כותרת ושורת נתונים אחת",
          variant: "destructive",
        });
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

      // Initialize generation statuses
      setGenerationStatuses(
        parsedRows.map((row, index) => ({
          index,
          status: "pending",
          name: row[parsedHeaders[0]] || `שורה ${index + 1}`,
        }))
      );
    } catch (error) {
      toast({
        title: "שגיאה בקריאת הקובץ",
        description: "לא ניתן לפרסר את קובץ ה-CSV",
        variant: "destructive",
      });
    }
  };

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

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    setProgress(0);

    for (let i = 0; i < rows.length; i++) {
      // Update status to generating
      setGenerationStatuses(prev =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: "generating" } : s
        )
      );

      // Simulate video generation (in real app, this would call an API)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update status to completed
      setGenerationStatuses(prev =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: "completed" } : s
        )
      );

      setProgress(((i + 1) / rows.length) * 100);
    }

    setIsGenerating(false);
    toast({
      title: "הסרטונים נוצרו בהצלחה!",
      description: `${rows.length} סרטונים מותאמים אישית נוצרו`,
    });
  };

  const getStatusIcon = (status: GenerationStatus["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />;
      case "generating":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case "completed":
        return <Check className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: GenerationStatus["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">ממתין</Badge>;
      case "generating":
        return <Badge variant="default" className="bg-primary">מייצר...</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500">הושלם</Badge>;
      case "error":
        return <Badge variant="destructive">שגיאה</Badge>;
    }
  };

  const completedCount = generationStatuses.filter(s => s.status === "completed").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            קובץ CSV נטען בהצלחה
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {rows.length} נמענים
            </span>
            {file && (
              <span className="text-muted-foreground">
                {file.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>מייצר סרטונים...</span>
              <span>{completedCount} / {rows.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Data Preview Table */}
        <ScrollArea className="flex-1 max-h-[300px] border rounded-lg">
          <div className="min-w-max">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center sticky top-0 bg-background z-10">#</TableHead>
                  <TableHead className="w-24 text-center sticky top-0 bg-background z-10">סטטוס</TableHead>
                  {allCompleted && (
                    <>
                      <TableHead className="w-20 text-center sticky top-0 bg-background z-10">תצוגה</TableHead>
                      <TableHead className="w-20 text-center sticky top-0 bg-background z-10">
                        <div className="flex items-center justify-center gap-1">
                          <Checkbox 
                            checked={confirmedRows.size === rows.length}
                            onCheckedChange={handleConfirmAll}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          />
                          <span className="text-xs">אישור</span>
                        </div>
                      </TableHead>
                    </>
                  )}
                  {headers.map((header, idx) => (
                    <TableHead key={idx} className="sticky top-0 bg-background z-10 whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, rowIdx) => (
                  <TableRow key={rowIdx} className={
                    generationStatuses[rowIdx]?.status === "generating" 
                      ? "bg-primary/5" 
                      : confirmedRows.has(rowIdx)
                      ? "bg-green-500/10"
                      : generationStatuses[rowIdx]?.status === "completed"
                      ? "bg-green-500/5"
                      : ""
                  }>
                    <TableCell className="text-center font-medium">
                      <div className="flex items-center justify-center">
                        {getStatusIcon(generationStatuses[rowIdx]?.status || "pending")}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(generationStatuses[rowIdx]?.status || "pending")}
                    </TableCell>
                    {allCompleted && (
                      <>
                        {/* Video Preview */}
                        <TableCell className="text-center">
                          <div className="relative w-12 h-16 mx-auto rounded overflow-hidden bg-muted group cursor-pointer">
                            <img 
                              src={templateCategories[selectedCategory].templates[0]?.thumbnail} 
                              alt="תצוגה מקדימה"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                          </div>
                        </TableCell>
                        {/* Confirmation */}
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={confirmedRows.has(rowIdx)}
                            onCheckedChange={(checked) => handleConfirmRow(rowIdx, !!checked)}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          />
                        </TableCell>
                      </>
                    )}
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
        </ScrollArea>

        {/* Field Mapping Info */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">שדות שזוהו:</h4>
          <div className="flex flex-wrap gap-2">
            {headers.map((header, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {header}
              </Badge>
            ))}
          </div>
        </div>

        {/* Templates Selection with Dropdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm">בחר תבנית:</span>
            <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val as keyof typeof templateCategories)}>
              <SelectTrigger className="w-[180px] h-8 text-sm bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {Object.entries(templateCategories).map(([key, { label }]) => (
                  <SelectItem key={key} value={key} className="text-sm">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {templateCategories[selectedCategory].templates.map((template) => (
              <button
                key={template.id}
                className="group relative aspect-[9/16] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <img 
                  src={template.thumbnail} 
                  alt={template.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white text-xs font-medium truncate">{template.title}</p>
                  <p className="text-white/70 text-[10px]">{template.category}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            <X className="w-4 h-4 ml-2" />
            ביטול
          </Button>
          
          {allCompleted && confirmedRows.size > 0 ? (
            <Button 
              variant="celebration" 
              className="flex-1 animate-fade-in" 
              onClick={() => {
                toast({
                  title: "הסרטונים נשלחו!",
                  description: `${confirmedRows.size} סרטונים נשלחו בהצלחה`,
                });
                onOpenChange(false);
              }}
            >
              <Send className="w-4 h-4 ml-2" />
              שלח {confirmedRows.size} סרטונים
            </Button>
          ) : (
            <Button 
              variant="celebration" 
              className="flex-1" 
              onClick={handleGenerateAll}
              disabled={isGenerating || rows.length === 0 || allCompleted}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  מייצר סרטונים...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 ml-2" />
                  צור {rows.length} סרטונים
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
