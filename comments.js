const http = require('http');
const fs = require('fs').promises;
const url = require('url');
const qs = require('querystring');
const template = require('./lib/template.js');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const db = require('./lib/db.js');
const shortid = require('shortid');
const cookie = require('cookie');

const parseCookies = (request) => {
    const list = {};
    const rc = request.headers.cookie;

    rc && rc.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
};

const authUser = (cookies) => {
    return cookies.email === 'egoing' && cookies.password === '1111';
};

const renderHTML = async (title, list, body, control, authStatusUI) => {
    return template.HTML(title, list, body, control, authStatusUI);
};

const app = http.createServer(async (request, response) => {
    const _url = request.url;
    const queryData = url.parse(_url, true).query;
    const pathname = url.parse(_url, true).pathname;
    const cookies = parseCookies(request);
    const user = authUser(cookies);
    const authStatusUI = template.authStatusUI(request, response);
    let title = queryData.id;
    let description = queryData.id;
    let list = template.list(request.list);
    let control = '';

    if (pathname === '/') {
        if (!title) {
            title = 'Welcome';
            description = 'Hello, Node.js';
            control = `<a href="/create">create</a>`;
        } else {
            try {
                description = await fs.readFile(`data/${title}`, 'utf8');
                control = `<a href="/create">create</a> <a href="/update?id=${title}">update</a> <form action="delete_process" method="post"><input type="hidden" name="id" value="${title}"><input type="submit" value="delete"></form>`;
            } catch (err) {
                response.writeHead(404);
                response.end('Not found');
                return;
            }
        }
        const html = await renderHTML(title, list, `<h2>${title}</h2>${description}`, control, authStatusUI);
        response.writeHead(200);
        response.end(html);
    } else if (pathname === '/create') {
        if (!user) {
            response.end('Login required');
        } else {
            title = 'WEB - create';
            const html = await renderHTML(title, list, `
                <form action="/create_process" method="post">
                    <p><input type="text" name="title" placeholder="title"></p>
                    <p>
                        <textarea name="description" placeholder="description"></textarea>
                    </p>
                    <p>
                        <input type="submit">
                    </p>
                </form>
            `, '', authStatusUI);
            response.writeHead(200);
            response.end(html);
        }
    } else if (pathname === '/create_process') {
        if (!user) {
            response.end('Login required');
        } else {
            let body = '';
            request.on('data', data => body += data);
            request.on('end', async () => {
                const post = qs.parse(body);
                const title = post.title;
                const description = post.description;
                await fs.writeFile(`data/${title}`, description, 'utf8');
                response.writeHead(302, { Location: `/?id=${title}` });
                response.end();
            });
        }
    } else if (pathname === '/update') {
        if (!user) {
            response.end('Login required');
        } else {
            try {
                description = await fs.readFile(`data/${title}`, 'utf8');
                const html = await renderHTML(title, list, `
                    <form action="/update_process" method="post">
                        <input type="hidden" name="id" value="${title}">
                        <p><input type="text" name="title" placeholder="title" value="${title}"></p>
                        <p>
                            <textarea name="description" placeholder="description">${description}</textarea>
                        </p>
                        <p>
                            <input type="submit">
                        </p>
                    </form>
                `, `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`, authStatusUI);
                response.writeHead(200);
                response.end(html);
            } catch (err) {
                response.writeHead(404);
                response.end('Not found');
            }
        }
    } else if (pathname === '/update_process') {
        if (!user) {
            response.end('Login required');
        } else {
            let body = '';
            request.on('data', data => body += data);
            request.on('end', async () => {
                const post = qs.parse(body);
                const id = post.id;
                const title = post.title;
                const description = post.description;
                await fs.rename(`data/${id}`, `data/${title}`);
                await fs.writeFile(`data/${title}`, description, 'utf8');
                response.writeHead(302, { Location: `/?id=${title}` });
                response.end();
            });
        }
    } else if (pathname === '/delete_process') {
        if (!user) {
            response.end('Login required');
        } else {
            let body = '';
            request.on('data', data => body += data);
            request.on('end', async () => {
                const post = qs.parse(body);
                const id = post.id;
                await fs.unlink(`data/${id}`);
                response.writeHead(302, { Location: `/` });
                response.end();
            });
        }
    } else if (pathname === '/login') {
        title = 'Login';
        const html = await renderHTML(title, list, `
            <form action="/login_process" method="post">
                <p><input type="text" name="email" placeholder="email"></p>
                <p><input type="password" name="password" placeholder="password"></p>
                <p><input type="submit"></p>
            </form>
        `, '', authStatusUI);
        response.writeHead(200);
        response.end(html);
    } else if (pathname === '/login_process') {
        let body = '';
        request.on('data', data => body += data);
        request.on('end', () => {
            const post = qs.parse(body);
            if (post.email === 'egoing' && post.password === '1111') {
                response.writeHead(302, {
                    'Set-Cookie': [
                        `email=${post.email}`,
                        `password=${post.password}`,
                        `nickname=egoing`
                    ],
                    Location: `/`
                });
                response.end();
            } else {
                response.end('Who?');
            }
        });
    } else if (pathname === '/logout_process') {
        response.writeHead(302, {
            'Set-Cookie': [
                `email=; Max-Age=0`,
                `password=; Max-Age=0`,
                `nickname=; Max-Age=0`
            ],
            Location: `/`
        });
        response.end();
    } else {
        response.writeHead(404);
        response.end('Not found');
    }
});

app.listen(3000);
