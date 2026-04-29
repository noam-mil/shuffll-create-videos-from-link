import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Play, Edit, Upload, ArrowRight, ArrowLeft, Type, Palette, Music, User, Phone, CalendarIcon, Gift, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { CloudflareVideoEmbed } from "./CloudflareVideoEmbed";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  thumbnail: string;
  category: string;
  duration?: string;
  videoId?: string;
}

interface VideoPresets {
  effect: string;
  background: string;
  textAnimation: string;
  music: string;
  speed: string;
}

interface RecipientDetails {
  fullName: string;
  phoneNumber: string;
  sendDate: Date | undefined;
  giftUrl: string;
}

type DialogStep = "preview" | "edit" | "recipient" | "confirmation";

const effectIcons: Record<string, React.ReactNode> = {
  "בלונים": "🎈",
  "קונפטי": "🎊",
  "זיקוקים": "🎆",
  "כוכבים": "⭐",
  "ללא": null,
};

const backgroundStyles: Record<string, string> = {
  "מסיבה": "from-pink-500/30 via-purple-500/30 to-indigo-500/30",
  "אלגנטי": "from-amber-200/20 via-yellow-100/20 to-amber-200/20",
  "צבעוני": "from-red-500/25 via-green-500/25 to-blue-500/25",
  "מינימלי": "from-gray-100/10 to-gray-200/10",
  "גרדיאנט": "from-primary/30 via-accent/30 to-celebration/30",
};

export const TemplateDialog = ({
  open,
  onOpenChange,
  title,
  thumbnail,
  category,
  duration,
  videoId,
}: TemplateDialogProps) => {
  const navigate = useNavigate();
  const { metaOrgSlug } = useParams<{ metaOrgSlug: string }>();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';
  const [currentStep, setCurrentStep] = useState<DialogStep>("preview");
  const [presets, setPresets] = useState<VideoPresets>({
    effect: "בלונים",
    background: "מסיבה",
    textAnimation: "הופעה הדרגתית",
    music: "שמחה",
    speed: "רגיל",
  });
  const [recipient, setRecipient] = useState<RecipientDetails>({
    fullName: "",
    phoneNumber: "",
    sendDate: undefined,
    giftUrl: "",
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep("preview");
    }
    onOpenChange(newOpen);
  };

  const updatePreset = (key: keyof VideoPresets, value: string) => {
    setPresets(prev => ({ ...prev, [key]: value }));
  };

  const getTextAnimationClass = () => {
    switch (presets.textAnimation) {
      case "הקפצה": return "animate-bounce";
      case "זום": return "animate-pulse";
      case "גלישה": return "animate-fade-in";
      default: return "";
    }
  };

  const getMusicIcon = () => {
    switch (presets.music) {
      case "שמחה": return "🎉";
      case "רומנטית": return "💕";
      case "אנרגטית": return "⚡";
      case "רגועה": return "🌿";
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-base">
            {category}{duration ? ` • ${duration}` : ''}
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 px-1">
          {/* Preview Step */}
          {currentStep === "preview" && (
            <div className="flex gap-5 items-start">
              <div className="w-[240px] flex-shrink-0 rounded-xl overflow-hidden border border-border">
                {videoId ? (
                  <CloudflareVideoEmbed videoId={videoId} />
                ) : (
                  <div className="relative aspect-[9/16]">
                    <img 
                      src={thumbnail} 
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="bg-primary/90 rounded-full p-4">
                        <Play className="w-8 h-8 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 flex-1">
                <Button 
                  size="sm" 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/${metaOrgSlug}/csv-upload`);
                  }}
                >
                  <Upload className="w-4 h-4 me-2" />
                  טען CSV לפרסונליזציה
                </Button>
                <Button size="sm" className="w-full" variant="default" onClick={() => setCurrentStep("edit")}>
                  <Edit className="w-4 h-4 me-2" />
                  ערוך תבנית
                </Button>
              </div>
            </div>
          )}

          {/* Edit Step */}
          {currentStep === "edit" && (
            <div className="space-y-6">
              {/* Live Preview Thumbnail */}
              <div className="relative max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-primary/50 shadow-lg">
                {videoId ? (
                  <CloudflareVideoEmbed videoId={videoId} />
                ) : (
                  <div className="aspect-[9/16] relative">
                    <img 
                      src={thumbnail} 
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${backgroundStyles[presets.background] || ""} transition-all duration-500`} />
                    
                    {effectIcons[presets.effect] && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="absolute top-2 right-2 text-2xl animate-bounce">{effectIcons[presets.effect]}</div>
                        <div className="absolute top-4 left-3 text-xl animate-pulse delay-100">{effectIcons[presets.effect]}</div>
                        <div className="absolute bottom-8 right-4 text-lg animate-bounce delay-200">{effectIcons[presets.effect]}</div>
                        <div className="absolute bottom-12 left-2 text-2xl animate-pulse delay-300">{effectIcons[presets.effect]}</div>
                      </div>
                    )}

                    <div className={`absolute bottom-16 inset-x-0 text-center ${getTextAnimationClass()}`}>
                      <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
                        {title}
                      </span>
                    </div>

                    {getMusicIcon() && (
                      <div className="absolute bottom-4 left-2 bg-black/60 rounded-full px-2 py-1 flex items-center gap-1">
                        <Music className="w-3 h-3 text-white" />
                        <span className="text-sm">{getMusicIcon()}</span>
                      </div>
                    )}

                    <div className="absolute bottom-4 right-2 bg-black/60 text-white rounded-full px-2 py-1 text-xs">
                      {presets.speed === "איטי" ? "0.5x" : presets.speed === "מהיר" ? "2x" : "1x"}
                    </div>

                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      תצוגה מקדימה
                    </div>
                  </div>
                )}
              </div>

              {/* Edit Accordion */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="text">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Type className="w-5 h-5 text-primary" />
                      עריכת טקסט
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="main-text">שם החוגג</Label>
                        <Input id="main-text" placeholder="הזן שם החוגג..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sub-text">טקסט משני</Label>
                        <Textarea id="sub-text" placeholder="הזן טקסט משני..." className="min-h-[60px]" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="colors">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-primary" />
                      עריכת צבעים
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="bg-color">צבע רקע</Label>
                        <div className="flex gap-2">
                          <Input id="bg-color" type="color" className="w-20 h-10" />
                          <Input placeholder="#ffffff" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="text-color">צבע טקסט</Label>
                        <div className="flex gap-2">
                          <Input id="text-color" type="color" className="w-20 h-10" />
                          <Input placeholder="#000000" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accent-color">צבע מבטא</Label>
                        <div className="flex gap-2">
                          <Input id="accent-color" type="color" className="w-20 h-10" />
                          <Input placeholder="#ff6b6b" />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="video">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Play className="w-5 h-5 text-primary" />
                      עריכת וידאו
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-5 pt-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">אפקט חגיגי</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "בלונים", icon: "🎈" },
                            { value: "קונפטי", icon: "🎊" },
                            { value: "זיקוקים", icon: "🎆" },
                            { value: "כוכבים", icon: "⭐" },
                            { value: "ללא", icon: "✕" },
                          ].map((item) => (
                            <button
                              key={item.value}
                              onClick={() => updatePreset("effect", item.value)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                                presets.effect === item.value
                                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                                  : "bg-muted/50 hover:bg-muted text-foreground"
                              }`}
                            >
                              <span>{item.icon}</span>
                              <span>{item.value}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">סגנון רקע</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { value: "מסיבה", gradient: "from-pink-500 to-purple-500" },
                            { value: "אלגנטי", gradient: "from-amber-200 to-yellow-100" },
                            { value: "צבעוני", gradient: "from-red-500 via-green-500 to-blue-500" },
                            { value: "מינימלי", gradient: "from-gray-200 to-gray-300" },
                            { value: "גרדיאנט", gradient: "from-primary to-accent" },
                          ].map((item) => (
                            <button
                              key={item.value}
                              onClick={() => updatePreset("background", item.value)}
                              className={`relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                                presets.background === item.value
                                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                  : "hover:scale-105"
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient}`} />
                              <span className="text-[10px] text-muted-foreground">{item.value}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">אנימציית טקסט</Label>
                        <div className="flex flex-wrap gap-2">
                          {["הופעה הדרגתית", "הקפצה", "גלישה", "זום", "ללא"].map((anim) => (
                            <button
                              key={anim}
                              onClick={() => updatePreset("textAnimation", anim)}
                              className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                                presets.textAnimation === anim
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted/50 hover:bg-muted text-foreground"
                              }`}
                            >
                              {anim}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">מוזיקת רקע</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "שמחה", icon: "🎉" },
                            { value: "רומנטית", icon: "💕" },
                            { value: "אנרגטית", icon: "⚡" },
                            { value: "רגועה", icon: "🌿" },
                            { value: "ללא", icon: "🔇" },
                          ].map((item) => (
                            <button
                              key={item.value}
                              onClick={() => updatePreset("music", item.value)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all ${
                                presets.music === item.value
                                  ? "bg-primary text-primary-foreground shadow-md"
                                  : "bg-muted/50 hover:bg-muted text-foreground"
                              }`}
                            >
                              <span>{item.icon}</span>
                              <span>{item.value}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex gap-3">
                <Button size="lg" className="flex-1" variant="outline" onClick={() => setCurrentStep("preview")}>
                  חזור
                </Button>
                <Button size="lg" className="flex-1" variant="celebration" onClick={() => setCurrentStep("recipient")}>
                  <ArrowRight className="w-4 h-4 ml-2" />
                  המשך
                </Button>
              </div>
            </div>
          )}

          {/* Recipient Details Step */}
          {currentStep === "recipient" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Send className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">פרטי הנמען</h3>
                <p className="text-sm text-muted-foreground">הזן את פרטי האדם שיקבל את הסרטון</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient-name" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    שם מלא
                  </Label>
                  <Input 
                    id="recipient-name" 
                    placeholder="הזן שם מלא..."
                    value={recipient.fullName}
                    onChange={(e) => setRecipient(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient-phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    מספר טלפון
                  </Label>
                  <Input 
                    id="recipient-phone" 
                    type="tel"
                    placeholder="050-0000000"
                    value={recipient.phoneNumber}
                    onChange={(e) => setRecipient(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    dir="ltr"
                    className="text-left"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    תאריך שליחה
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal",
                          !recipient.sendDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {recipient.sendDate ? (
                          format(recipient.sendDate, "PPP", { locale: he })
                        ) : (
                          <span>בחר תאריך</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={recipient.sendDate}
                        onSelect={(date) => setRecipient(prev => ({ ...prev, sendDate: date }))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gift-url" className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" />
                    קישור למתנה (אופציונלי)
                  </Label>
                  <Input 
                    id="gift-url" 
                    type="url"
                    placeholder="https://..."
                    value={recipient.giftUrl}
                    onChange={(e) => setRecipient(prev => ({ ...prev, giftUrl: e.target.value }))}
                    dir="ltr"
                    className="text-left"
                  />
                  <p className="text-xs text-muted-foreground">הוסף קישור לאתר מתנות או שובר</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button size="lg" className="flex-1" variant="outline" onClick={() => setCurrentStep("edit")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  חזור
                </Button>
                <Button size="lg" className="flex-1" variant="celebration" onClick={() => setCurrentStep("confirmation")}>
                  <Send className="w-4 h-4 ml-2" />
                  שלח סרטון
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation Step */}
          {currentStep === "confirmation" && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-scale-in">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground">הסרטון מתוזמן לשליחה!</h3>
                <p className="text-sm text-muted-foreground">הסרטון יישלח אוטומטית בתאריך שנבחר</p>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">פרטי השליחה</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">נמען</p>
                      <p className="font-medium">{recipient.fullName || "לא הוזן"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">טלפון</p>
                      <p className="font-medium" dir="ltr">{recipient.phoneNumber || "לא הוזן"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">תאריך שליחה</p>
                      <p className="font-medium">
                        {recipient.sendDate ? format(recipient.sendDate, "EEEE, d בMMMM yyyy", { locale: he }) : "לא נבחר"}
                      </p>
                    </div>
                  </div>

                  {recipient.giftUrl && (
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Gift className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">קישור למתנה</p>
                        <p className="font-medium truncate text-sm" dir="ltr">{recipient.giftUrl}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-blue-900 text-sm">תקבל התראה כשהסרטון יישלח</p>
                  <p className="text-xs text-blue-700 mt-1">נשלח לך עדכון בהודעה ובאימייל ברגע שהסרטון יישלח לנמען</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button size="lg" className="flex-1" variant="outline" onClick={() => setCurrentStep("recipient")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ערוך פרטים
                </Button>
                <Button size="lg" className="flex-1" variant="celebration" onClick={() => handleOpenChange(false)}>
                  סיום
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
