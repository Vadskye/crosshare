/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { Link, RouteComponentProps } from "@reach/router";

import { requiresAuth, AuthProps } from './App';
import { Page } from './Page';
import {
  CategoryIndexT, CategoryIndexV, UserPlaysT, UserPlaysV, getDateString
} from './common/dbtypes';
import { getFromSessionOrDB } from './common/dbUtils';

interface CategoryProps extends RouteComponentProps, AuthProps {
  categoryId?: string
}

const CategoryNames: { [key: string]: string } = {
  dailymini: "Daily Mini"
}

export const Category = requiresAuth(({ user, categoryId }: CategoryProps) => {
  const [plays, setPlays] = React.useState<UserPlaysT | null>(null);
  const [puzzles, setPuzzles] = React.useState<CategoryIndexT | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!categoryId || !CategoryNames.hasOwnProperty(categoryId)) {
      console.log("Missing category id")
      setError(true);
      return;
    }
    Promise.all([
      getFromSessionOrDB('categories', categoryId, CategoryIndexV, 24 * 60 * 60 * 1000),
      getFromSessionOrDB('up', user.uid, UserPlaysV, -1)
    ])
      .then(([puzzles, plays]) => {
        setPuzzles(puzzles);
        setPlays(plays);
      }).catch(reason => {
        console.error(reason);
        setError(true);
      });
  }, [categoryId, user.uid]);

  if (!puzzles) {
    return <Page title={null}>Loading...</Page>;
  }

  if (!categoryId || !CategoryNames.hasOwnProperty(categoryId) || !puzzles || error) {
    return <Page title={null}>Error loading category page</Page>;
  }

  const today = new Date()
  today.setHours(12);
  const ds = getDateString(today);

  function prettifyDateString(dateString: string) {
    const groups = dateString.match(/^(\d+)-(\d+)-(\d+)$/);
    if (!groups) {
      throw new Error("Bad date string: " + dateString);
    }
    return (parseInt(groups[2]) + 1) + '/' + groups[3] + '/' + groups[1];
  }

  return (
    <Page title={CategoryNames[categoryId] + ' Puzzles'}>
      <ul css={{
        margin: 0,
        padding: 0,
        listStyleType: 'none',
      }}>
        {Object.keys(puzzles).filter(k => k <= ds).sort().reverse().map((dateString) => {
          const play = plays && plays[puzzles[dateString]];
          return (<li key={dateString} css={{
            padding: '0.5em 0',
            width: '100%',
          }}>
            <Link css={{ display: 'inline-block', width: '50%', textAlign: 'right', paddingRight: '1em', fontWeight: play ?.[3] ? 'normal' : 'bold' }} to={'/crosswords/' + puzzles[dateString]}>{CategoryNames[categoryId] + ' for ' + prettifyDateString(dateString)}</Link>
            <div css={{ display: 'inline-block', width: '50%', paddingLeft: '1em' }}>{play ?.[3] ? 'completed ' + (play ?.[2] ? 'with helpers' : 'without helpers') : (play ? 'unfinished' : '')}</div>
          </li>);
        })}
      </ul>
    </Page>
  );
});