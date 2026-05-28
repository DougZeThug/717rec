import { Plus, Trophy } from 'lucide-react';
import React, { useState } from 'react';

import AdminSectionWrapper from '@/components/admin/AdminSectionWrapper';
import { Button } from '@/components/ui/button';
import { useDivisions } from '@/hooks/useDivisions';

import CreateDivisionDialog from './CreateDivisionDialog';
import DivisionRow from './DivisionRow';

const DivisionsTab: React.FC = () => {
  const { divisions, isLoading } = useDivisions();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <AdminSectionWrapper title="Divisions" icon={Trophy}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Manage division names, display grouping, and weights.
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-1" />
          New Division
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading divisions…</p>
      ) : divisions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No divisions yet. Create one to get started.
        </p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {divisions.map((d) => (
              <DivisionRow key={d.id} division={d} layout="card" />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-2 px-3 font-medium">Name</th>
                  <th className="py-2 px-3 font-medium">Display Division</th>
                  <th className="py-2 px-3 font-medium">Weight</th>
                  <th className="py-2 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {divisions.map((d) => (
                  <DivisionRow key={d.id} division={d} layout="row" />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CreateDivisionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AdminSectionWrapper>
  );
};

export default DivisionsTab;