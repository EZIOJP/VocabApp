// src/api.js


import { API_BASE_URL } from "./apiConfig.js";

export const fetchAllWords = () =>
  fetch(`${API_BASE_URL}/words/`).then((res) => res.json());


export const fetchGroups = () =>
  fetch(`${API_BASE_URL}/groups/summary/`).then((res) => res.json());

export const fetchGroupWords = (groupNumber) =>
  fetch(`${API_BASE_URL}/groups/${groupNumber}/words/`).then((res) => res.json());

export const markSwipeRead = (wordId) =>
  fetch(`${API_BASE_URL}/words/mark-read/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word_id: wordId }),
  });

export const submitQuizAnswer = ({ wordId, quality }) =>
  fetch(`${API_BASE_URL}/reviews/answer/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word_id: wordId, quality }),
  }).then((res) => res.json());
