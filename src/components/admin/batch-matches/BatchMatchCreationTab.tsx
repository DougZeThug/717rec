import { Calendar } from 'lucide-react';
import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import AdminSectionWrapper from '../AdminSectionWrapper';
import BatchMatchFormContainer from './BatchMatchFormContainer';

const BatchMatchCreationTab = () => {
  return (
    <AdminSectionWrapper title="Batch Match Creation" icon={Calendar}>
      <Card className="rounded-xl shadow-md">
        <CardHeader>
          <CardTitle>Create Multiple Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchMatchFormContainer />
        </CardContent>
      </Card>
    </AdminSectionWrapper>
  );
};

export default BatchMatchCreationTab;
