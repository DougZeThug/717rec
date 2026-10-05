import React from 'react';

import ProfileForm from '@/components/profile/ProfileForm';
import TeamMembershipSection from '@/components/teams/TeamMembershipSection';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ProfileSetupCardProps {
  initialUsername: string;
  initialFullName: string;
  onProfileUpdated: () => void;
  /** Team membership needs a signed-in user, so it only shows for one. */
  showTeamMembership: boolean;
}

const ProfileSetupCard: React.FC<ProfileSetupCardProps> = ({
  initialUsername,
  initialFullName,
  onProfileUpdated,
  showTeamMembership,
}) => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">
          Set Up Your Profile
        </CardTitle>
        <CardDescription>Enter your name and details</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm
          initialUsername={initialUsername}
          initialFullName={initialFullName}
          onProfileUpdated={onProfileUpdated}
        />

        {/* Team Membership Section */}
        {showTeamMembership && (
          <>
            <Separator className="my-6" />
            <TeamMembershipSection />
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          This information will be visible to other players
        </p>
      </CardFooter>
    </Card>
  );
};

export default ProfileSetupCard;
