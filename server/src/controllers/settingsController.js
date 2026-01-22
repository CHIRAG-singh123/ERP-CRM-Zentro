import Team from '../models/Team.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get all teams
// @route   GET /api/settings/teams
// @access  Private (Admin)
export const getTeams = asyncHandler(async (req, res) => {
  const query = { isActive: true };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const teams = await Team.find(query)
    .populate('members', 'name email profile.avatar role')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  // Transform teams to match frontend TeamListItem format
  const transformedTeams = teams.map((team) => ({
    id: team._id.toString(),
    team: team.name,
    members: team.members.length,
    queueType: team.queueType || '',
    coverage: team.coverage || '',
    escalationPolicy: team.escalationPolicy || '',
    _id: team._id,
    name: team.name,
    description: team.description,
    memberIds: team.members.map((m) => (typeof m === 'object' ? m._id : m).toString()),
  }));

  res.json(transformedTeams);
});

// @desc    Get single team
// @route   GET /api/settings/teams/:id
// @access  Private (Admin)
export const getTeam = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, isActive: true };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const team = await Team.findOne(query)
    .populate('members', 'name email profile.avatar role')
    .populate('createdBy', 'name email');

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  res.json({ team });
});

// @desc    Create team
// @route   POST /api/settings/teams
// @access  Private (Admin)
export const createTeam = asyncHandler(async (req, res) => {
  const { name, description, members = [], queueType, coverage, escalationPolicy } = req.body;

  // Validate members array length
  if (members.length > 10) {
    return res.status(400).json({ error: 'A team can have a maximum of 10 members' });
  }

  // Validate member IDs exist, are active, and are employees or admins (not customers)
  if (members.length > 0) {
    const validMembers = await User.find({
      _id: { $in: members },
      isActive: true,
      role: { $in: ['employee', 'admin'] }, // Only allow employees and admins
    });

    if (validMembers.length !== members.length) {
      return res.status(400).json({ error: 'One or more member IDs are invalid, inactive, or not employees/admins' });
    }
  }

  const teamData = {
    name,
    description: description || '',
    members,
    queueType: queueType || '',
    coverage: coverage || '',
    escalationPolicy: escalationPolicy || '',
    createdBy: req.user._id,
    tenantId: req.user.tenantId,
    isActive: true,
  };

  const team = await Team.create(teamData);
  await team.populate('members', 'name email profile.avatar role');
  await team.populate('createdBy', 'name email');

  res.status(201).json({ team });
});

// @desc    Update team
// @route   PUT /api/settings/teams/:id
// @access  Private (Admin)
export const updateTeam = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, isActive: true };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const team = await Team.findOne(query);

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const { name, description, members, queueType, coverage, escalationPolicy } = req.body;

  // Validate members array length if provided
  if (members !== undefined) {
    if (members.length > 10) {
      return res.status(400).json({ error: 'A team can have a maximum of 10 members' });
    }

    // Validate member IDs exist, are active, and are employees or admins (not customers)
    if (members.length > 0) {
      const validMembers = await User.find({
        _id: { $in: members },
        isActive: true,
        role: { $in: ['employee', 'admin'] }, // Only allow employees and admins
      });

      if (validMembers.length !== members.length) {
        return res.status(400).json({ error: 'One or more member IDs are invalid, inactive, or not employees/admins' });
      }
    }
    team.members = members;
  }

  if (name !== undefined) team.name = name;
  if (description !== undefined) team.description = description;
  if (queueType !== undefined) team.queueType = queueType;
  if (coverage !== undefined) team.coverage = coverage;
  if (escalationPolicy !== undefined) team.escalationPolicy = escalationPolicy;

  await team.save();
  await team.populate('members', 'name email profile.avatar role');
  await team.populate('createdBy', 'name email');

  res.json({ team });
});

// @desc    Delete team (soft delete)
// @route   DELETE /api/settings/teams/:id
// @access  Private (Admin)
export const deleteTeam = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id, isActive: true };
  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const team = await Team.findOne(query);

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  team.isActive = false;
  await team.save();

  res.json({ message: 'Team deleted successfully' });
});
