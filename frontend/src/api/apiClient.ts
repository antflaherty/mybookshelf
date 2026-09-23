import { Book, ReadingProgress, User } from "@/lib/definitions";

const API_URL = "http://192.168.2.207:8080";
const REGISTER_ROUTE = '/auth/register'
const LOGIN_ROUTE = '/auth/login'
const BOOKS_ROUTE = "/books";
const READING_PROGRESS_ROUTE = "/readingProgress";


export async function register(user: User) {
  const url = API_URL + REGISTER_ROUTE;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });

  const result = await response.json();

  if(!response.ok) {
     throw new Error(`status: ${response.status}, error: ${result.error}`)
  }
}

export async function login(user: User): Promise<string> {
   const url = API_URL + LOGIN_ROUTE;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({...user, email: user.email.toLowerCase()}),
  });

  const result  = await response.json();

  if(!response.ok) {
    throw new Error(`status: ${response.status}, error: ${result.error}`)
  }

  return result.access_token;
}

export async function getReadingProgress(accessToken: string | null): Promise<
  (Book & ReadingProgress)[]
> {
  if(accessToken == null) {
    throw new Error('not logged in');
  }

  const url = API_URL + READING_PROGRESS_ROUTE;
  const response = await fetch(url,{  method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },

  });

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  const result = await response.json();
  return result ?? [];
}

export async function getBooks(): Promise<Book[]> {
  const url = API_URL + BOOKS_ROUTE;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  const result = await response.json();
  return result ?? [];
}

export async function logReadingProgress(
  readingProgress: ReadingProgress,
): Promise<void> {
  const url = `${API_URL}${READING_PROGRESS_ROUTE}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({...readingProgress, bookId: readingProgress.id}),
  });

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
}
