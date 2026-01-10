import { Calendar } from 'lucide-react';
import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import AdminSectionWrapper from '../AdminSectionWrapper';
import BatchMatchForm from './BatchMatchForm';

const BatchMatchCreationTab = () => {
  return (
    <AdminSectionWrapper title="Batch Match Creation" icon={Calendar}>
      <Card className="rounded-xl shadow-md">
        <CardHeader>
          <CardTitle>Create Multiple Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchMatchForm />
        </CardContent>
      </Card>
    </AdminSectionWrapper>
  );
};

export default BatchMatchCreationTab;
