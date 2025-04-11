
const handleCreateTeam = async (teamData: Omit<Team, "id" | "created_at">) => {
  try {
    // Prepare data for Supabase, ensuring image_url is handled correctly
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: teamData.name,
        logo_url: teamData.logoUrl,
        image_url: teamData.imageUrl || null, // Use null if no image is provided
        players: teamData.players.map(p => p.name),
        seed: null, // Default
        division_id: teamData.division
      })
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    // Transform the new team to our application Team type
    const newTeam: Team = {
      id: data.id,
      name: data.name,
      logoUrl: data.logo_url,
      imageUrl: data.image_url, // Use the returned image_url
      players: data.players ? data.players.map((playerName: string) => ({
        name: playerName
      })) : [],
      wins: teamData.wins,
      losses: teamData.losses,
      created_at: data.created_at,
      division: data.division_id
    };
    
    setTeams([...teams, newTeam]);
    setIsFormOpen(false);
    toast({
      title: "Team Created",
      description: `${newTeam.name} has been successfully created.`,
    });
  } catch (error) {
    console.error("Error creating team:", error);
    toast({
      title: "Error",
      description: "Failed to create team. Please try again.",
      variant: "destructive"
    });
  }
};
