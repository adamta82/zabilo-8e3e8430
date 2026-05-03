import { useState } from 'react';
import { Cake, Gift, Trash2, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  useBirthdayGreetings,
  useSendBirthdayGreeting,
  useDeleteBirthdayGreeting,
} from '@/hooks/useBirthdayGreetings';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

const EMOJIS = ['🎉', '🎂', '🎁', '🥳', '🎈', '✨', '❤️', '🌟'];
const SUGGESTIONS = [
  'מזל טוב! שתהיה לך שנה מדהימה ומלאת הצלחות 🎉',
  'יום הולדת שמח! בריאות, אושר והגשמה 🎂',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: { id: string; user_id: string; full_name: string } | null;
  dateStr: string;
}

export function BirthdayGreetingDialog({ open, onOpenChange, recipient, dateStr }: Props) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState<string>('🎉');

  const { data: greetings = [], isLoading } = useBirthdayGreetings(recipient?.user_id, dateStr);
  const sendGreeting = useSendBirthdayGreeting();
  const deleteGreeting = useDeleteBirthdayGreeting();

  if (!recipient) return null;

  const handleSend = async () => {
    if (!message.trim()) return;
    await sendGreeting.mutateAsync({
      recipient_id: recipient.user_id,
      birthday_date: dateStr,
      message,
      emoji,
    });
    setMessage('');
  };

  const initials = recipient.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 bg-gradient-to-br from-pink-500/10 to-amber-500/10">
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            יום הולדת ל{recipient.full_name}
          </DialogTitle>
          <DialogDescription>שלח/י ברכה אישית — היא תופיע כאן לכל החברים בצוות</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Compose */}
          <div className="space-y-2 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1 flex-wrap">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-lg w-8 h-8 rounded-md hover:bg-muted transition-colors ${
                    emoji === e ? 'bg-pink-500/10 ring-1 ring-pink-500/40' : ''
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder="כתוב/י ברכה חמה..."
              rows={3}
              className="resize-none"
            />
            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMessage(s)}
                  className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70 text-muted-foreground"
                >
                  {s.slice(0, 30)}…
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">{message.length}/500</span>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!message.trim() || sendGreeting.isPending}
                className="bg-pink-500 hover:bg-pink-600 text-white gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                שלח ברכה
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-pink-500" />
              <h3 className="text-sm font-semibold">ברכות ({greetings.length})</h3>
            </div>
            {isLoading ? (
              <div className="text-xs text-muted-foreground text-center py-4">טוען...</div>
            ) : greetings.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                עדיין אין ברכות. היה/י הראשון/ה לברך! 🎉
              </div>
            ) : (
              greetings.map((g) => {
                const isMine = g.sender_id === user?.id;
                const senderInitials = g.sender?.full_name
                  ?.split(' ').map((w) => w[0]).join('').slice(0, 2) || '?';
                return (
                  <div key={g.id} className="flex gap-2 p-3 rounded-lg bg-muted/40 border">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                        {senderInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold">{g.sender?.full_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(g.created_at), { locale: he, addSuffix: true })}
                        </span>
                        {isMine && (
                          <button
                            onClick={() => deleteGreeting.mutate(g.id)}
                            className="ml-auto text-muted-foreground hover:text-destructive"
                            aria-label="מחק"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {g.emoji && <span className="ml-1">{g.emoji}</span>}
                        {g.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
