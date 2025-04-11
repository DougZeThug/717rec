
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  onSubmit({
    name,
    logoUrl: previewImage || undefined,
    imageUrl: imageUrl || undefined, // Use undefined if no image
    players: players.filter(p => p.name.trim() !== ""),
    wins,
    losses,
    division: team?.division // preserve existing division if editing
  });
};
