import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { OrgLayout } from "@/components/layouts/OrgLayout";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, FileSpreadsheet, ArrowRight, Check, X, Users, Calendar, Gift, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { CsvPreviewDialog } from "@/components/CsvPreviewDialog";

interface ExcelFieldSetting {
  id: string;
  field_name: string;
  field_type: string;
  is_mandatory: boolean;
  correct_year: boolean;
  allow_empty: boolean;
  regex_pattern: string | null;
}

interface RowError {
  rowIndex: number;
  fieldName: string;
  errorType: 'empty' | 'regex';
  value: string;
}

interface ValidationResult {
  isValid: boolean;
  missingMandatoryFields: ExcelFieldSetting[];
  matchedFields: ExcelFieldSetting[];
  unmatchedHeaders: string[];
  rowErrors: RowError[];
}

const OrgCsvUpload = () => {
  const { t, i18n } = useTranslation();
  const { metaOrgSlug } = useParams<{ metaOrgSlug: string }>();
  const { metaOrganization, currentOrg } = useOrganization();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const isRtl = i18n.language === 'he' || i18n.language === 'ar';

  // Fetch excel settings for validation
  const targetId = currentOrg?.id || metaOrganization?.id;
  const targetType = currentOrg ? 'organization' : 'meta_organization';

  const { data: excelSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['excel-settings', targetId, targetType],
    queryFn: async () => {
      if (!targetId) return [];
      
      const query = currentOrg
        ? supabase.from('organization_excel_settings').select('*').eq('organization_id', targetId)
        : supabase.from('organization_excel_settings').select('*').eq('meta_organization_id', targetId);
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ExcelFieldSetting[];
    },
    enabled: !!targetId,
  });

  // Parse CSV line helper
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

  // Parse full CSV file
  const parseCsvFile = async (file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const headers = parseCSVLine(lines[0]);
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row);
    }
    
    return { headers, rows };
  };

  // Validate CSV against settings (both headers and row values)
  const validateCsv = (
    headers: string[], 
    rows: Record<string, string>[], 
    settings: ExcelFieldSetting[]
  ): ValidationResult => {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    const matchedFields: ExcelFieldSetting[] = [];
    const missingMandatoryFields: ExcelFieldSetting[] = [];
    const matchedHeadersSet = new Set<string>();
    const rowErrors: RowError[] = [];

    // First, check header-level validation
    for (const setting of settings) {
      const normalizedFieldName = setting.field_name.toLowerCase().trim();
      const headerIndex = normalizedHeaders.indexOf(normalizedFieldName);
      const isMatched = headerIndex !== -1;
      
      if (isMatched) {
        matchedFields.push(setting);
        matchedHeadersSet.add(normalizedFieldName);
        
        // Find the actual header name (with original casing)
        const actualHeaderName = headers[headerIndex];
        
        // Now validate each row for this field
        rows.forEach((row, rowIndex) => {
          const value = row[actualHeaderName] || "";
          
          // Check allow_empty
          if (!setting.allow_empty && value.trim() === "") {
            rowErrors.push({
              rowIndex: rowIndex + 1, // 1-indexed for display
              fieldName: setting.field_name,
              errorType: 'empty',
              value: value
            });
          }
          
          // Check regex pattern
          if (setting.regex_pattern && value.trim() !== "") {
            try {
              const regex = new RegExp(setting.regex_pattern);
              if (!regex.test(value)) {
                rowErrors.push({
                  rowIndex: rowIndex + 1,
                  fieldName: setting.field_name,
                  errorType: 'regex',
                  value: value
                });
              }
            } catch (e) {
              // Invalid regex pattern - skip validation
              console.warn(`Invalid regex pattern for field ${setting.field_name}:`, setting.regex_pattern);
            }
          }
        });
      } else if (setting.is_mandatory) {
        missingMandatoryFields.push(setting);
      }
    }

    const unmatchedHeaders = headers.filter(
      h => !matchedHeadersSet.has(h.toLowerCase().trim())
    );

    const hasHeaderErrors = missingMandatoryFields.length > 0;
    const hasRowErrors = rowErrors.length > 0;

    return {
      isValid: !hasHeaderErrors && !hasRowErrors,
      missingMandatoryFields,
      matchedFields,
      unmatchedHeaders,
      rowErrors
    };
  };

  // Handle file upload and validation
  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    
    try {
      const { headers, rows } = await parseCsvFile(file);
      setCsvHeaders(headers);
      
      if (excelSettings && excelSettings.length > 0) {
        const result = validateCsv(headers, rows, excelSettings);
        setValidationResult(result);
      } else {
        // No settings configured - allow any file
        setValidationResult({
          isValid: true,
          missingMandatoryFields: [],
          matchedFields: [],
          unmatchedHeaders: headers,
          rowErrors: []
        });
      }
    } catch (error) {
      console.error("Error parsing CSV:", error);
      setValidationResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "text/csv" || file?.name.endsWith(".csv") || file?.name.endsWith(".xlsx") || file?.name.endsWith(".xls")) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setCsvHeaders([]);
    setValidationResult(null);
  };

  const getFieldTypeLabel = (fieldType: string): string => {
    const labels: Record<string, string> = {
      'first_name': t('org.admin.firstName'),
      'full_name': t('org.admin.fullName'),
      'phone_number': t('org.admin.phoneNumber'),
      'email': t('org.admin.email'),
      'celebration_date': t('org.admin.celebrationDate')
    };
    return labels[fieldType] || fieldType;
  };

  const mandatoryFields = excelSettings?.filter(s => s.is_mandatory) || [];
  const hasSettings = excelSettings && excelSettings.length > 0;

  return (
    <OrgLayout>
      <div className="container mx-auto px-6 py-12 max-w-4xl" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Back Link */}
        <Link 
          to={`/${metaOrgSlug}`} 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowRight className={`w-5 h-5 ${!isRtl ? 'rotate-180' : ''}`} />
          <span>{t('orgHome.csvUpload.backToHome', 'חזרה לדף הבית')}</span>
        </Link>

        {/* Page Title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <FileSpreadsheet className="w-4 h-4" />
            {t('orgHome.csvUpload.title', 'העלאת קובץ CSV')}
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            {t('orgHome.csvUpload.heading', 'יצירת סרטונים מרובים')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('orgHome.csvUpload.description', 'העלה קובץ CSV עם רשימת העובדים שלך ליצירת סרטוני ברכה מותאמים אישית לכולם')}
          </p>
        </div>

        {/* Required Fields Info - Collapsible */}
        {hasSettings && mandatoryFields.length > 0 && (
          <Collapsible className="mb-6 animate-fade-in">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span>{t('orgHome.csvUpload.requiredFields', 'שדות חובה בקובץ:')}</span>
                  <Badge variant="secondary" className="text-xs">
                    {mandatoryFields.length}
                  </Badge>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {mandatoryFields.map((field) => (
                      <Badge key={field.id} variant="outline" className="bg-background">
                        {field.field_name}
                        <span className="text-muted-foreground text-xs mr-1">
                          ({getFieldTypeLabel(field.field_type)})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Upload Area */}
        <Card className="mb-8 overflow-hidden animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardContent className="p-0">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl m-4 p-12 transition-all duration-300 ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : uploadedFile
                  ? validationResult?.isValid
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-destructive/50 bg-destructive/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#CEE95C]/5 rounded-full blur-3xl" />
              </div>

              <div className="relative text-center">
                {uploadedFile ? (
                  <div className="space-y-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                      validationResult?.isValid ? 'bg-green-500/10' : 'bg-destructive/10'
                    }`}>
                      {validationResult?.isValid ? (
                        <Check className="w-8 h-8 text-green-500" />
                      ) : (
                        <AlertCircle className="w-8 h-8 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground mb-1">
                        {uploadedFile.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="gap-2"
                    >
                      <X className="w-4 h-4" />
                      {t('orgHome.csvUpload.removeFile', 'הסר קובץ')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto transition-all duration-300 ${
                      isDragging ? "bg-primary/20 scale-110" : "bg-muted"
                    }`}>
                      <Upload className={`w-10 h-10 transition-colors ${
                        isDragging ? "text-primary" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-foreground mb-2">
                        {t('orgHome.csvUpload.dragDrop', 'גרור ושחרר קובץ CSV כאן')}
                      </p>
                      <p className="text-muted-foreground mb-4">
                        {t('orgHome.csvUpload.orClick', 'או לחץ לבחירת קובץ מהמחשב')}
                      </p>
                    </div>
                    <label>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button variant="outline" size="lg" className="cursor-pointer" asChild>
                        <span>
                          <FileSpreadsheet className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                          {t('orgHome.csvUpload.selectFile', 'בחר קובץ CSV')}
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Results */}
        {uploadedFile && validationResult && (
          <div className="space-y-4 mb-8 animate-fade-in">
            {/* Missing Mandatory Fields Alert */}
            {validationResult.missingMandatoryFields.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('orgHome.csvUpload.missingFieldsTitle', 'שדות חובה חסרים')}</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">
                    {t('orgHome.csvUpload.missingFieldsDesc', 'הקובץ חסר את השדות הבאים שהוגדרו כחובה:')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {validationResult.missingMandatoryFields.map((field) => (
                      <Badge key={field.id} variant="destructive">
                        {field.field_name}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Row Validation Errors */}
            {validationResult.rowErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('orgHome.csvUpload.rowErrorsTitle', 'שגיאות בנתונים')}</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">
                    {t('orgHome.csvUpload.rowErrorsDesc', 'נמצאו שגיאות בערכים בקובץ:')}
                  </p>
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {/* Group errors by type for better display */}
                    {(() => {
                      const emptyErrors = validationResult.rowErrors.filter(e => e.errorType === 'empty');
                      const regexErrors = validationResult.rowErrors.filter(e => e.errorType === 'regex');
                      
                      // Group by field name
                      const emptyByField = emptyErrors.reduce((acc, err) => {
                        if (!acc[err.fieldName]) acc[err.fieldName] = [];
                        acc[err.fieldName].push(err.rowIndex);
                        return acc;
                      }, {} as Record<string, number[]>);
                      
                      const regexByField = regexErrors.reduce((acc, err) => {
                        if (!acc[err.fieldName]) acc[err.fieldName] = [];
                        acc[err.fieldName].push({ row: err.rowIndex, value: err.value });
                        return acc;
                      }, {} as Record<string, { row: number; value: string }[]>);
                      
                      return (
                        <>
                          {Object.entries(emptyByField).map(([fieldName, rows]) => (
                            <div key={`empty-${fieldName}`} className="text-sm bg-destructive/10 p-2 rounded">
                              <span className="font-medium">{fieldName}:</span>{' '}
                              {t('orgHome.csvUpload.emptyValuesError', 'ערכים ריקים בשורות')}{' '}
                              <span className="font-mono">
                                {rows.length > 10 
                                  ? `${rows.slice(0, 10).join(', ')}... (+${rows.length - 10})`
                                  : rows.join(', ')
                                }
                              </span>
                            </div>
                          ))}
                          {Object.entries(regexByField).map(([fieldName, items]) => (
                            <div key={`regex-${fieldName}`} className="text-sm bg-destructive/10 p-2 rounded">
                              <span className="font-medium">{fieldName}:</span>{' '}
                              {t('orgHome.csvUpload.regexError', 'ערכים לא תקינים בשורות')}{' '}
                              <span className="font-mono">
                                {items.length > 5 
                                  ? `${items.slice(0, 5).map(i => i.row).join(', ')}... (+${items.length - 5})`
                                  : items.map(i => i.row).join(', ')
                                }
                              </span>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-xs mt-2 text-destructive/80">
                    {t('orgHome.csvUpload.totalErrors', 'סה"כ {{count}} שגיאות', { count: validationResult.rowErrors.length })}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Matched Fields */}
            {validationResult.matchedFields.length > 0 && validationResult.missingMandatoryFields.length === 0 && validationResult.rowErrors.length === 0 && (
              <Alert className="border-green-500/50 bg-green-500/5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700 dark:text-green-400">
                  {t('orgHome.csvUpload.matchedFieldsTitle', 'שדות שזוהו')}
                </AlertTitle>
                <AlertDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {validationResult.matchedFields.map((field) => (
                      <Badge key={field.id} variant="outline" className="bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400">
                        <CheckCircle2 className={`w-3 h-3 ${isRtl ? 'ml-1' : 'mr-1'}`} />
                        {field.field_name}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* CSV Headers Preview */}
            <Card className="p-4">
              <p className="text-sm font-medium text-foreground mb-2">
                {t('orgHome.csvUpload.columnsFound', 'עמודות שנמצאו בקובץ:')}
              </p>
              <div className="flex flex-wrap gap-2">
                {csvHeaders.map((header, idx) => {
                  const isMatched = validationResult.matchedFields.some(
                    f => f.field_name.toLowerCase().trim() === header.toLowerCase().trim()
                  );
                  return (
                    <Badge 
                      key={idx} 
                      variant={isMatched ? "default" : "secondary"}
                      className={isMatched ? "bg-green-500" : ""}
                    >
                      {header}
                    </Badge>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Instructions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {t('orgHome.csvUpload.card1Title', 'פרטי עובדים')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('orgHome.csvUpload.card1Desc', 'הקובץ צריך לכלול שמות, תאריכים ופרטים נוספים לכל עובד')}
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#00DBDB]/10 rounded-xl flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-[#00DBDB]" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {t('orgHome.csvUpload.card2Title', 'תאריכים אוטומטיים')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('orgHome.csvUpload.card2Desc', 'המערכת תזהה אוטומטית ימי הולדת ותאריכים חשובים')}
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-[#CEE95C]/10 rounded-xl flex items-center justify-center mb-4">
              <Gift className="w-6 h-6 text-[#CEE95C]" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {t('orgHome.csvUpload.card3Title', 'ברכות מותאמות')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('orgHome.csvUpload.card3Desc', 'כל סרטון יותאם אישית עם השם והפרטים של העובד')}
            </p>
          </Card>
        </div>

        {/* Sample Format - only show if settings are configured */}
        {hasSettings && (
          <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                {t('orgHome.csvUpload.sampleFormat', 'פורמט קובץ לדוגמה')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      {excelSettings?.map((setting, idx) => (
                        <th key={idx} className="border border-border px-4 py-2 text-right font-medium">
                          {setting.field_name}
                          {setting.is_mandatory && (
                            <span className="text-destructive mr-1">*</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {excelSettings?.map((setting, idx) => (
                        <td key={idx} className="border border-border px-4 py-2 text-muted-foreground">
                          {getExampleValue(setting.field_type)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                * {t('orgHome.csvUpload.mandatoryNote', 'שדות חובה')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        <div className="text-center mt-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <Button
            variant="celebration"
            size="lg"
            disabled={!uploadedFile || !validationResult?.isValid}
            className="min-w-[200px]"
            onClick={() => setShowPreviewDialog(true)}
          >
            {t('orgHome.csvUpload.continue', 'המשך לשלב הבא')}
            <ArrowRight className={`w-4 h-4 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
          </Button>
          {uploadedFile && !validationResult?.isValid && (
            <p className="text-sm text-destructive mt-2">
              {t('orgHome.csvUpload.fixErrors', 'יש לתקן את השגיאות לפני המשך')}
            </p>
          )}
        </div>
      </div>

      {/* CSV Preview Dialog */}
      <CsvPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        file={uploadedFile}
      />
    </OrgLayout>
  );
};

// Helper function to generate example values for each field type
function getExampleValue(fieldType: string): string {
  const examples: Record<string, string> = {
    'first_name': 'דוד',
    'full_name': 'דוד כהן',
    'phone_number': '050-1234567',
    'email': 'david@company.com',
    'celebration_date': '15/03/1990'
  };
  return examples[fieldType] || '...';
}

export default OrgCsvUpload;
