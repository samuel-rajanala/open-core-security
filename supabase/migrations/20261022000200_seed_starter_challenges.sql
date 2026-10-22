-- Open Core Security starter challenge library
-- Adds 14 challenges (the original security-headers challenge remains untouched).
-- Private flag hashes are SHA-256 of the exact OCS{...} values and are never stored in public rows.

-- Decode the Leaked Note
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'Decode the Leaked Note', 'A support engineer found an encoded note in a ticket attachment. Decode the sample and identify the security lesson.', 'Cryptography', 'beginner', 100, true
where not exists (select 1 from public.challenges where title = 'Decode the Leaked Note');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, '38d1a4fd443639a543dc31988850cb52e11b13017ad7d9b0a56622b86ce3ee92'
from public.challenges c
where c.title = 'Decode the Leaked Note'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- The Public Roadmap
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'The Public Roadmap', 'A crawler indexed a public robots.txt file that reveals a hidden staging path. Determine the key lesson from the evidence.', 'OSINT', 'beginner', 100, true
where not exists (select 1 from public.challenges where title = 'The Public Roadmap');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, '7cc31591b8eca2f10b5eebd62c17b3e3e56662ff382155031ae6f21b6a5bcd87'
from public.challenges c
where c.title = 'The Public Roadmap'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- One Factor Too Few
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'One Factor Too Few', 'A sign-in policy allows access with only a password, even for administrator accounts. Identify the missing control.', 'Identity & Access', 'beginner', 100, true
where not exists (select 1 from public.challenges where title = 'One Factor Too Few');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, '105750062f76367a24320f5bf35a73cd6f88a001221347157736906fd11343fd'
from public.challenges c
where c.title = 'One Factor Too Few'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- A Query Gone Wrong
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'A Query Gone Wrong', 'Review a small application code sample and identify the database defense that prevents user input from changing query structure.', 'Web Security', 'beginner', 100, true
where not exists (select 1 from public.challenges where title = 'A Query Gone Wrong');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, 'faa54dffb9d35fc2719f4dca684b4b1383930c6cb8a25c551cb7d8a95a55de0a'
from public.challenges c
where c.title = 'A Query Gone Wrong'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- Hash or Cipher?
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'Hash or Cipher?', 'A developer claims a SHA-256 digest can be decrypted to recover the original password. Correct the misconception.', 'Cryptography', 'beginner', 100, true
where not exists (select 1 from public.challenges where title = 'Hash or Cipher?');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, '1ad62c345ac019d3204429b5341a3a7f440a114e46b94f7108eeaf60e991fe52'
from public.challenges c
where c.title = 'Hash or Cipher?'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- Too Much Access
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'Too Much Access', 'A service account can read every customer record and modify billing settings, although it only needs to create support tickets. Identify the governing principle.', 'Security Architecture', 'beginner', 100, true
where not exists (select 1 from public.challenges where title = 'Too Much Access');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, '56265e2937f0ca2375c9b0d6455147942344c8e5cd63859a95ef70ee1997ddeb'
from public.challenges c
where c.title = 'Too Much Access'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- Reconstruct the Incident
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'Reconstruct the Incident', 'A short incident log is missing reliable attribution fields. Identify the two core record details needed to correlate actions to a person and a timeline.', 'Digital Forensics', 'beginner', 100, true
where not exists (select 1 from public.challenges where title = 'Reconstruct the Incident');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, '90dc5b991c7cfa95df3a455c1816b62e2f826f49002a005886fef89bc99ec8ea'
from public.challenges c
where c.title = 'Reconstruct the Incident'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- The Invoice Switch
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'The Invoice Switch', 'A user can change an invoice ID in a URL and view another customer''s invoice. Identify the vulnerability class and required authorization check.', 'Web Security', 'intermediate', 250, true
where not exists (select 1 from public.challenges where title = 'The Invoice Switch');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, '8c99ebddc1c6e353479f1bf07873e13d8d2462f3afa831b44a54fe721e012b8a'
from public.challenges c
where c.title = 'The Invoice Switch'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- Trust the Token?
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'Trust the Token?', 'An API accepts a JSON web token after decoding its payload, but does not verify its signature. Identify the essential validation step.', 'Identity & Access', 'intermediate', 250, true
where not exists (select 1 from public.challenges where title = 'Trust the Token?');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, '4691523854062603c17a2201b3bb23b76c1be8eeeee072480afed183dd65520c'
from public.challenges c
where c.title = 'Trust the Token?'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- The URL Fetcher
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'The URL Fetcher', 'A preview service fetches user-supplied URLs without validating destinations. Identify the risk and the key defensive requirement.', 'Cloud Security', 'intermediate', 300, true
where not exists (select 1 from public.challenges where title = 'The URL Fetcher');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, 'e2c2a4780f6a5da77db6d7b86e11b702c92076995b03df260a18b0f6d020b38e'
from public.challenges c
where c.title = 'The URL Fetcher'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- Cookie on the Loose
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'Cookie on the Loose', 'A session cookie is set without protections against script access or cross-site request contexts. Identify the three cookie attributes to configure.', 'Web Security', 'intermediate', 300, true
where not exists (select 1 from public.challenges where title = 'Cookie on the Loose');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, '96268bc8862852c0e17c0f34819888d3080f9e473dceac1382adde08c68112bb'
from public.challenges c
where c.title = 'Cookie on the Loose'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- DNS Query Trail
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'DNS Query Trail', 'A simulated packet summary shows repeated unusually long DNS queries to one external domain. Identify the likely data-exfiltration channel.', 'Network Security', 'intermediate', 350, true
where not exists (select 1 from public.challenges where title = 'DNS Query Trail');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, 'dd782be4a5187ab0ba07de316febc257ed182f668c27dc1151a21f7a6fa1e118'
from public.challenges c
where c.title = 'DNS Query Trail'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- The Double Spend
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'The Double Spend', 'Two concurrent purchase requests both read the same account balance before either writes an update. Identify the database property/technique needed to prevent inconsistent double spending.', 'Application Security', 'advanced', 700, true
where not exists (select 1 from public.challenges where title = 'The Double Spend');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, 'dcc872e5406dabb58e776c4842c2788099264d04636675cc91a095a8738076e1'
from public.challenges c
where c.title = 'The Double Spend'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

-- Unsafe Object Revival
insert into public.challenges (title, description, category, difficulty, points, is_published)
select 'Unsafe Object Revival', 'A service reconstructs complex objects directly from untrusted serialized input. Identify the safe rule for handling serialized data.', 'Application Security', 'advanced', 900, true
where not exists (select 1 from public.challenges where title = 'Unsafe Object Revival');

insert into private.challenge_flags (challenge_id, flag_hash)
select c.id, '9bb7daf8d96030ae7720b3c8e7025aa63aec59abf64b134ef0d4d7cf294d891c'
from public.challenges c
where c.title = 'Unsafe Object Revival'
  and not exists (select 1 from private.challenge_flags cf where cf.challenge_id = c.id);

