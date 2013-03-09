#!/usr/bin/env node

var Require = require("mr");

Require.findPackageLocationAndModuleId(process.argv[2])
.then(function (info) {
    return Require.loadPackage(info.location, {
        overlays: [
            "browser"
        ]
    })
    .then(function (packageRequire) {
        return packageRequire.deepLoad(info.id)
        .then(function () {
            var module = packageRequire.getModuleDescriptor(info.id);
            tree(module, packageRequire, writer("", function (line) {
                console.log(line);
            }));
        });
    })
})
.done();

function writer(leader, write) {
    var first = true;
    return function (line) {
        if (first) {
            write(leader + "- " + line);
            first = false;
        } else {
            write(leader + "  " + line);
        }
    };
}

function tree(module, packageRequire, write, visited) {

    var canonical = packageRequire.location + "#" + module.id;
    visited = visited || {};
    if (visited[canonical]) {
        write(JSON.stringify(module.id) + " (" + visited[canonical] + ")");
        return;
    }
    visited[canonical] = "CYCLE";

    /*
    if (module.text) {
        write("bytes: " + module.text.length);
    }
    */

    if (module.mappingRedirect) {
        write(JSON.stringify(module.id) + " to " + JSON.stringify(module.mappingRedirect) + " in " + JSON.stringify(module.mappingRequire.config.name));
        var redirect = module.mappingRequire.getModuleDescriptor(module.mappingRedirect);
        tree(redirect, module.mappingRequire, writer("", write), visited);
    } else if (module.redirect) {
        write(JSON.stringify(module.id) + " -> " + JSON.stringify(module.redirect));
        var id = packageRequire.resolve(module.redirect, module.id);
        var redirect = packageRequire.getModuleDescriptor(id);
        tree(redirect, packageRequire, writer("", write), visited);
    } else if (module.dependencies) {
        write(JSON.stringify(module.id));
        module.dependencies.forEach(function (id) {
            id = packageRequire.resolve(id, module.id);
            var dependency = packageRequire.getModuleDescriptor(id);
            tree(dependency, packageRequire, writer("", write), visited);
        });
    }
    //write(module.require.location);

    visited[canonical] = "cached";
}

