const express = require("express");
const bodyParser = require("body-parser");
const _= require('underscore');
const Database = require("./db");
const Logger = require("./logger");

var instance = null;

const Server = function () {
 
    this.app = express();
    this.app.set("view engine", "ejs");

    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());
    this.status = 'Initialized';
    return this;
}

Server.prototype.init = function (port) {
    this.port = port;
    this.applyDomainList();
    this.listner = this.app.listen(this.port, function () {
        Logger.info(`Mockable Server : Start Listening at ${port}`)
    });
    this.status = 'Started';
}

Server.prototype.createEndpoint= function(domainName, pathObject){
    const path = `${domainName}${pathObject.path}`;
    try {

        const response = function (req, res) {
            res.set(pathObject.header);
            res.send(pathObject.body);
        };
        
        switch (pathObject.method) {
            case "get": {
                this.app.get(path, response);
                break;
            }
            case "post": {
                this.app.post(path, response);
                break;
            }
            case "put": {
                this.app.put(path, response);
                break;
            }
            case "delete": {
                this.app.delete(path, response);
                break;
            }
        }
        
        Logger.info(`Endpoint Created {Domain: ${domainName},Endpoint info: ${JSON.stringify(pathObject)}}`)
    }
    catch (error) {
        Logger.error(`Endpoint Created Error {Domain: ${domainName}${pathObject.path},error: ${error}}`)
    }
}

Server.prototype.applyDomainList = function () {
    try {
        const domains = Database.getAllDomains();
        domains.forEach(domain => {
            if (domain.paths.length === 0)
                return;
            domain.paths.forEach(path => {
                Logger.info(`Apply Endpoint : ${domain.domain}${path.path}`);
                this.createEndpoint(domain.domain,path);
            });
        });
    } catch (error) {
        Logger.error(`Domain List cannot Find ${error}`)
    }
}

const trimPrefix = function (path, prefix) {
    return prefix? path.substr(prefix.length): path;
}

const findRoute = function(stack,path) {
    let routes=[];
    stack.forEach(function(layer) {
        if (!layer) return;
        if (layer && !layer.match(path)) return;
        if (['query', 'expressInit'].indexOf(layer.name) != -1) return;
        if (layer.name == 'router') {
            routes=routes.concat(_findRoute(trimPrefix(path, layer.path),layer.handle.stack));
        } else {
            if (layer.name == 'bound dispatch') {
                routes.push({route: layer || null, stack: stack});
            }
        }
    });
    return routes;
}

Server.prototype.removeRoute = function (path, method) {
    Logger.info(`Removing .... {path: ${path}, method: ${method}}`)
    const found = findRoute(this.app._router.stack, path);

    let route, stack;
    
    found.forEach(function (layer) {
        route = layer.route;
        stack = layer.stack;

        if (route) {
            if(method === undefined){  // if no method delete all resource with the given path
                idx = stack.indexOf(route);
                stack.splice(idx, 1);
            }else if(JSON.stringify(route.route.methods).toUpperCase().indexOf(method.toUpperCase())>=0){  // if method defined delete only the resource with the given ath and method
                idx = stack.indexOf(route);
                stack.splice(idx, 1);
            }
        }
    });
    return true;
}

Server.prototype.stop = async function () {
    const port = this.port;
    try {
        await this.listner.close()
        Logger.info(`Closed Server at ${port}`);
        this.status = 'Stopped';
    } catch (error) {
        Logger.error(`Cannot Close Server at ${this.port}, error : ${error}`)
    }
}

Server.prototype.restart = async function () {
    if (this.port === null)
        return;
    await this.stop();
    this.init(this.port);
}

module.exports = () => {
    if (!instance) {
        Logger.info('Instanced Server')
        instance = new Server();
    }
    return instance;
};