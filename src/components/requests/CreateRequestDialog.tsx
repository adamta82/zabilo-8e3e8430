import { useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Home, Palmtree, Monitor, ShoppingCart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useCreateRequest } from "@/hooks/useRequests";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type RequestType = Database["public"]["Enums"]["request_type"];

interface WfhTask {
  id: string;
  description: string;
  estimatedHours: number;
  reference: string;
}

interface Item {
  id: string;
  name: string;
  quantity: number;
}

const WFH_CHECKLIST = [
  { id: "equipment", label: "יש לי את כל הציוד הנדרש לעבודה מהבית" },
  { id: "internet", label: "יש לי חיבור אינטרנט יציב" },
  { id: "available", label: "אהיה זמין/ה בטלפון ובמייל" },
  { id: "tasks", label: "תכננתי את המשימות ליום העבודה" },
];

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRequestDialog({ open, onOpenChange }: CreateRequestDialogProps) {
  const createRequest = useCreateRequest();

  const [requestType, setRequestType] = useState<RequestType | "">("");

  // WFH state
  const [wfhDate, setWfhDate] = useState<Date>();
  const [wfhTasks, setWfhTasks] = useState<WfhTask[]>([{ id: "1", description: "", estimatedHours: 1, reference: "" }]);
  const [wfhChecklist, setWfhChecklist] = useState<Record<string, boolean>>({});

  // Vacation state
  const [vacationStartDate, setVacationStartDate] = useState<Date>();
  const [vacationEndDate, setVacationEndDate] = useState<Date>();
  const [vacationReason, setVacationReason] = useState("");
  const [singleDay, setSingleDay] = useState(false);
  const [useVacationDays, setUseVacationDays] = useState(false);

  // Equipment/Groceries state
  const [items, setItems] = useState<Item[]>([{ id: "1", name: "", quantity: 1 }]);

  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setRequestType("");
    setWfhDate(undefined);
    setWfhTasks([{ id: "1", description: "", estimatedHours: 1, reference: "" }]);
    setWfhChecklist({});
    setVacationStartDate(undefined);
    setVacationEndDate(undefined);
    setVacationReason("");
    setSingleDay(false);
    setUseVacationDays(false);
    setItems([{ id: "1", name: "", quantity: 1 }]);
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addWfhTask = () => {
    setWfhTasks([...wfhTasks, { id: Date.now().toString(), description: "", estimatedHours: 1, reference: "" }]);
  };

  const removeWfhTask = (id: string) => {
    if (wfhTasks.length > 1) {
      setWfhTasks(wfhTasks.filter((t) => t.id !== id));
    }
  };

  const updateWfhTask = (id: string, field: keyof WfhTask, value: string | number) => {
    setWfhTasks(wfhTasks.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: "", quantity: 1 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof Item, value: string | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const getTotalHours = () => {
    return wfhTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  };

  const isFormValid = () => {
    if (!requestType) return false;

    switch (requestType) {
      case "wfh":
        return (
          wfhDate &&
          wfhTasks.some((t) => t.description.trim() && t.reference.trim()) &&
          WFH_CHECKLIST.every((item) => wfhChecklist[item.id])
        );
      case "vacation":
        return singleDay ? !!vacationStartDate : !!vacationStartDate && !!vacationEndDate;
      case "equipment":
      case "groceries":
        return items.some((i) => i.name.trim());
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!requestType || !isFormValid()) return;

    const baseRequest = {
      type: requestType,
      notes: notes || null,
    };

    let requestData: Parameters<typeof createRequest.mutateAsync>[0];

    switch (requestType) {
      case "wfh":
        requestData = {
          ...baseRequest,
          wfh_date: wfhDate ? format(wfhDate, "yyyy-MM-dd") : null,
          wfh_tasks: wfhTasks
            .filter((t) => t.description.trim())
            .map((t) => ({
              id: t.id,
              description: t.description,
              estimatedHours: t.estimatedHours,
              reference: t.reference,
            })) as unknown as null,
          wfh_checklist: wfhChecklist as unknown as null,
        };
        break;
      case "vacation": {
        const endDate = singleDay ? vacationStartDate : vacationEndDate;
        requestData = {
          ...baseRequest,
          vacation_start_date: vacationStartDate ? format(vacationStartDate, "yyyy-MM-dd") : null,
          vacation_end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
          vacation_reason: vacationReason || null,
          vacation_single_day: singleDay,
          use_vacation_days: useVacationDays,
        };
        break;
      }
      case "equipment":
      case "groceries":
        requestData = {
          ...baseRequest,
          items: items
            .filter((i) => i.name.trim())
            .map((i) => ({
              id: i.id,
              name: i.name,
              quantity: i.quantity,
            })) as unknown as null,
        };
        break;
      default:
        return;
    }

    await createRequest.mutateAsync(requestData);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>בקשה חדשה</DialogTitle>
          <DialogDescription>בחר את סוג הבקשה ומלא את הפרטים הנדרשים</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Request Type Selection */}
          <div className="space-y-2">
            <Label>סוג הבקשה</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג בקשה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wfh">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    עבודה מהבית
                  </div>
                </SelectItem>
                <SelectItem value="vacation">
                  <div className="flex items-center gap-2">
                    <Palmtree className="h-4 w-4" />
                    חופשה
                  </div>
                </SelectItem>
                <SelectItem value="equipment">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    ציוד משרדי
                  </div>
                </SelectItem>
                <SelectItem value="groceries">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    מצרכים
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* WFH Form */}
          {requestType === "wfh" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>תאריך עבודה מהבית</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-right", !wfhDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {wfhDate ? format(wfhDate, "PPP", { locale: he }) : "בחר תאריך"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={wfhDate} onSelect={setWfhDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>משימות מתוכננות</Label>
                  <span className="text-sm text-muted-foreground">סה״כ: {getTotalHours()} שעות</span>
                </div>
                {wfhTasks.map((task) => (
                  <div key={task.id} className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="תיאור המשימה"
                        value={task.description}
                        onChange={(e) => updateWfhTask(task.id, "description", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={task.estimatedHours}
                        onChange={(e) => updateWfhTask(task.id, "estimatedHours", parseFloat(e.target.value) || 0)}
                        className="w-20"
                        placeholder="שעות"
                      />
                      <Input
                        placeholder="רפרנט"
                        value={task.reference}
                        onChange={(e) => updateWfhTask(task.id, "reference", e.target.value)}
                        className="w-32"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWfhTask(task.id)}
                        disabled={wfhTasks.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addWfhTask} className="gap-2">
                  <Plus className="h-4 w-4" />
                  הוסף משימה
                </Button>
              </div>

              <div className="space-y-3">
                <Label>אישור תנאים</Label>
                {WFH_CHECKLIST.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      id={item.id}
                      checked={wfhChecklist[item.id] || false}
                      onCheckedChange={(checked) => setWfhChecklist({ ...wfhChecklist, [item.id]: checked === true })}
                    />
                    <label htmlFor={item.id} className="text-sm">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vacation Form */}
          {requestType === "vacation" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="single-day">יום חופש אחד</Label>
                <Switch
                  id="single-day"
                  checked={singleDay}
                  onCheckedChange={(checked) => {
                    setSingleDay(checked);
                    if (checked) setVacationEndDate(undefined);
                  }}
                />
              </div>

              <div className={cn("grid gap-4", singleDay ? "grid-cols-1" : "grid-cols-2")}>
                <div className="space-y-2">
                  <Label>{singleDay ? "תאריך החופש" : "מתאריך"}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-right", !vacationStartDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {vacationStartDate ? format(vacationStartDate, "dd/MM/yyyy") : "בחר"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={vacationStartDate}
                        onSelect={setVacationStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {!singleDay && (
                  <div className="space-y-2">
                    <Label>עד תאריך</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-right", !vacationEndDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {vacationEndDate ? format(vacationEndDate, "dd/MM/yyyy") : "בחר"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={vacationEndDate}
                          onSelect={setVacationEndDate}
                          disabled={(date) => (vacationStartDate ? date < vacationStartDate : false)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="use-vacation-days">שימוש בימי חופשה צבורים</Label>
                <Switch id="use-vacation-days" checked={useVacationDays} onCheckedChange={setUseVacationDays} />
              </div>

              <div className="space-y-2">
                <Label>סיבת החופשה (אופציונלי)</Label>
                <Textarea
                  placeholder="נסיעה, אירוע משפחתי..."
                  value={vacationReason}
                  onChange={(e) => setVacationReason(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Equipment/Groceries Form */}
          {(requestType === "equipment" || requestType === "groceries") && (
            <div className="space-y-4">
              <Alert className="bg-muted/50 border-muted-foreground/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  לפני הגשת הבקשה, מומלץ לבדוק{" "}
                    <Link
                    to={`/requests?type=${requestType}&status=approved,ordered`}
                    className="underline font-medium text-primary hover:text-primary/80"
                    onClick={() => onOpenChange(false)}
                  >
                    {requestType === "equipment" ? "רשימת ציוד משרדי שאושר/הוזמן" : "רשימת מצרכים שאושרו/הוזמנו"}
                  </Link>{" "}
                  כדי לוודא שהפריט לא הוזמן כבר.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>{requestType === "equipment" ? "פריטי ציוד" : "רשימת מצרכים"}</Label>
                {items.map((item) => (
                  <div key={item.id} className="flex gap-2">
                    <Input
                      placeholder={requestType === "equipment" ? "שם הפריט" : "שם המוצר"}
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                  <Plus className="h-4 w-4" />
                  הוסף פריט
                </Button>
              </div>
            </div>
          )}

          {/* Notes */}
          {requestType && (
            <div className="space-y-2">
              <Label>הערות (אופציונלי)</Label>
              <Textarea placeholder="הערות נוספות..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid() || createRequest.isPending}>
            {createRequest.isPending ? "שולח..." : "שלח בקשה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
