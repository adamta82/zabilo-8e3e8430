import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ROLE_PALETTE, textOn, type PlannerRole, type PlannerStrings } from '@/lib/shift-planner';

interface Props {
  t: PlannerStrings;
  roles: PlannerRole[];
  onAdd: (name: string, color: string) => void;
  onRemove: (role: PlannerRole) => void;
}

export function RoleManager({ t, roles, onAdd, onRemove }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(ROLE_PALETTE[0]);

  const submit = () => {
    const v = name.trim();
    if (!v || roles.some((r) => r.name === v)) return;
    onAdd(v, color);
    setName('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{t.rolesTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
              style={{ background: r.color, color: textOn(r.color) }}
            >
              {r.name}
              {!r.is_off && (
                <button
                  type="button"
                  onClick={() => onRemove(r)}
                  title={t.remove}
                  className="opacity-60 transition-opacity hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={t.roleName}
            className="h-9 w-full sm:w-48"
          />
          <div className="flex flex-wrap gap-1.5">
            {ROLE_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={cn(
                  'h-6 w-6 rounded-md border-2 transition-transform',
                  color === c ? 'border-foreground scale-110' : 'border-transparent'
                )}
              />
            ))}
          </div>
          <Button size="sm" onClick={submit} className="gap-1">
            <Plus className="h-4 w-4" />
            {t.add}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
