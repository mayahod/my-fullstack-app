export const authorFields = 'firstName username avatarVersion';

export const publicAuthor = ({ _id, firstName, username, avatarVersion }) => ({
  id: _id,
  firstName,
  username,
  avatarVersion,
});
