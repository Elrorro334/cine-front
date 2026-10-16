export interface Movie {
  id: number;
  title: string;
  tagline?: string;
  classification: string;
  duration: string;
  genre: string;
  allGenres?: string;
  rating?: string;
  posterUrl: string;
  backdropUrl?: string;
  synopsis: string;
  releaseYear?: string;
  director: string;
  actors?: string;
  trailerKey?: string | null;
  showtimes: string[];
}

export interface Promotion {
  id: number;
  title: string;
  tag: string;
  description: string;
  validity: string;
  gradient: string;
  icon: string;
}
