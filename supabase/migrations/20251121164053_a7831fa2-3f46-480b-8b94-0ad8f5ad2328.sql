-- Update playoff_rank for Fall 2025 tournament results
UPDATE team_season_stats tss
SET playoff_rank = CASE 
  -- Competitive Fall 2025
  WHEN t.name = 'Offdogs' THEN 1
  WHEN t.name = 'Cuzzo''s Clinic' THEN 2
  WHEN t.name = 'Hole Violators' THEN 3
  WHEN t.name = 'Jager Bombers' THEN 4
  WHEN t.name = 'Came from Dicks' THEN 5
  WHEN t.name = 'Pepperoni Cheesers' THEN 5
  WHEN t.name = '3 Amigos' THEN 7
  WHEN t.name = 'Hole Burners' THEN 8
  WHEN t.name = 'Bag Babies' THEN 9
  WHEN t.name = 'Seize the Maize' THEN 10
  
  -- Intermediate 1 Fall 2025
  WHEN t.name = 'Wrong Hole' THEN 1
  WHEN t.name = 'Bumbleweed' THEN 2
  WHEN t.name = 'Sweat Bandits' THEN 3
  WHEN t.name = 'Miracle @ Marion' THEN 4
  WHEN t.name = 'The Beards' THEN 5
  WHEN t.name = 'Happy Valley Hole Hunters' THEN 6
  WHEN t.name = 'Zoo Pals' THEN 7
  WHEN t.name = 'Mailmen' THEN 8
  
  -- Intermediate 2 Fall 2025
  WHEN t.name = 'Buttery Nips' THEN 1
  WHEN t.name = 'Tom & Tom' THEN 2
  WHEN t.name = 'Believers' THEN 3
  WHEN t.name = 'Toss D.Bag' THEN 4
  WHEN t.name = 'On a Mission' THEN 5
  WHEN t.name = 'Jerm' THEN 6
  WHEN t.name = 'The Undigestibles' THEN 7
  WHEN t.name = 'Triple Dippers' THEN 8
  
  -- Recreational Fall 2025
  WHEN t.name = 'The Cornholy Trinity' THEN 1
  WHEN t.name = 'Here for Fireball' THEN 2
  WHEN t.name = 'Sour Patch Kids' THEN 3
  WHEN t.name = 'Corn Kitties' THEN 4
  WHEN t.name = 'T-Baggers' THEN 5
  WHEN t.name = 'Cornographic Material' THEN 6
END
FROM teams t
JOIN seasons s ON s.name = 'Fall 2025'
WHERE tss.team_id = t.id
  AND tss.season_id = s.id
  AND t.name IN (
    'Offdogs', 'Cuzzo''s Clinic', 'Hole Violators', 'Jager Bombers', 
    'Came from Dicks', 'Pepperoni Cheesers', '3 Amigos', 'Hole Burners',
    'Bag Babies', 'Seize the Maize',
    'Wrong Hole', 'Bumbleweed', 'Sweat Bandits', 'Miracle @ Marion',
    'The Beards', 'Happy Valley Hole Hunters', 'Zoo Pals', 'Mailmen',
    'Buttery Nips', 'Tom & Tom', 'Believers', 'Toss D.Bag',
    'On a Mission', 'Jerm', 'The Undigestibles', 'Triple Dippers',
    'The Cornholy Trinity', 'Here for Fireball', 'Sour Patch Kids',
    'Corn Kitties', 'T-Baggers', 'Cornographic Material'
  );