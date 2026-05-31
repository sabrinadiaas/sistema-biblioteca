const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const autenticar = (req, res, next) => {
    const token = req.headers['authorization'];
    
    if (token && token.startsWith('Bearer ')) {
        const jwtToken = token.slice(7); 
        jwt.verify(jwtToken, 'SEGREDO', (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: 'Token de autenticação inválido.' });
            }
            req.usuario = decoded; 
            next();
        });
    } else {
        res.status(401).json({ error: 'Token de autenticação ausente ou inválido.' });
    }
};

const requireBibliotecario = (req, res, next) => {
    if (req.usuario && req.usuario.perfil === 'bibliotecario') {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Perfil de bibliotecário necessário.' });
    }
};

const requireLeitor = (req, res, next) => {
    if (req.usuario && req.usuario.perfil === 'leitor') {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Perfil de leitor necessário.' });
    }
};

module.exports = { autenticar, requireBibliotecario, requireLeitor};