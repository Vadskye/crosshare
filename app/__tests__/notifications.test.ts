import { getMockedPuzzle } from '../lib/testingUtils';
import { notificationsForPuzzleChange } from '../lib/notifications';
import { CommentWithRepliesT } from '../lib/dbtypes';
import { TimestampClass } from '../lib/firebaseWrapper';

jest.mock('../lib/firebaseWrapper');

const basePuzzle = getMockedPuzzle({ cs: undefined });

function getComment(fields?: Partial<CommentWithRepliesT>): CommentWithRepliesT {
  return {
    ...{
      c: 'A couple of two-worders today which I don\'t love, but I hope you all got it anyway!',
      i: 'LwgoVx0BAskM4wVJyoLj',
      t: 36.009,
      p: TimestampClass.now(),
      a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
      n: 'Mike D',
      ch: false,
    },
    ...fields
  };
}

test('shouldnt notify at all if comment is on own puzzle', () => {
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: basePuzzle.a })]
  };
  const notifications = notificationsForPuzzleChange(basePuzzle, puzzleWithComments, 'puzzle-id-here');
  expect(notifications.length).toEqual(0);
});

test('should notify for a new comment by somebody else', () => {
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })]
  };
  const notifications = notificationsForPuzzleChange(basePuzzle, puzzleWithComments, 'puzzle-id-here');
  expect(notifications.length).toEqual(1);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});

test('should notify for multiple comments by somebody else', () => {
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [
      getComment({ a: basePuzzle.a, i: 'foo' }),
      getComment({ a: 'dummy-author-id', i: 'bar', n: 'Jim' }),
      getComment({ a: 'another-author', i: 'bam', n: 'Tom' }),
    ]
  };
  const notifications = notificationsForPuzzleChange(basePuzzle, puzzleWithComments, 'puzzle-id-here');
  expect(notifications.length).toEqual(2);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});

test('should notify for a reply to own comment on own puzzle', () => {
  const puzzleWithOwn = {
    ...basePuzzle,
    cs: [getComment({ a: basePuzzle.a })]
  };
  const puzzleWithComments = {
    ...basePuzzle,
    cs: [getComment({ a: basePuzzle.a, r: [getComment({ a: 'dummy-author-id', i: 'bar', n: 'Jim' })] })]
  };
  const notifications = notificationsForPuzzleChange(puzzleWithOwn, puzzleWithComments, 'puzzle-id-here');
  expect(notifications.length).toEqual(1);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});

test('should notify comment author only when puzzle author replies', () => {
  const puzzleWithComment = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })]
  };
  const authorReplies = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id', r: [getComment({ a: basePuzzle.a, i: 'baz' })] })]
  };
  const notifications = notificationsForPuzzleChange(puzzleWithComment, authorReplies, 'puzzle-id-here');
  expect(notifications.length).toEqual(1);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});

test('should notify comment author and puzzle author when third party replies', () => {
  const puzzleWithComment = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id' })]
  };
  const authorReplies = {
    ...basePuzzle,
    cs: [getComment({ a: 'dummy-author-id', r: [getComment({ a: 'rando', i: 'baz' })] })]
  };
  const notifications = notificationsForPuzzleChange(puzzleWithComment, authorReplies, 'puzzle-id-here');
  expect(notifications.length).toEqual(2);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});

test('should handle a combination of multiple new comments and nested replies', () => {
  const startingPoint = {
    ...basePuzzle,
    cs: [getComment({ r: [getComment({ a: 'rando', i: 'baz' })] })]
  };
  const withReplies = {
    ...basePuzzle,
    cs: [
      getComment({ a: 'blaster', i: 'bam', n: 'BLAST' }),
      getComment({
        r: [
          getComment({
            a: 'rando', i: 'baz', r: [
              getComment({ i: 'whamo' }),
              getComment({ a: 'blaster', i: 'test' })
            ]
          }),
          getComment({ a: 'another-rando', i: 'foobar' })
        ]
      })
    ]
  };
  const notifications = notificationsForPuzzleChange(startingPoint, withReplies, 'puzzle-id-here');
  expect(notifications.length).toEqual(5);
  notifications.forEach(n => { delete n.t; });
  expect(notifications).toMatchSnapshot();
});