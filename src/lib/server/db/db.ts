import mysql from 'mysql2/promise';
import { DATABASE_URL } from '$env/static/private';

// Create a connection pool for better performance
export const pool = mysql.createPool(DATABASE_URL);
