-- Delete the duplicate "Winners Round 4" match for Cornographic Material vs Jerm
-- This is causing incorrect playoff statistics showing 3-3 instead of 3-2
DELETE FROM playoff_matches 
WHERE id = '20abd566-6abf-4e44-870e-1316eb337916';