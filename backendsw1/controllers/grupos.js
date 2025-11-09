const { response } = require("express");
const Grupo = require('../models/grupos');
const Usuario = require('../models/usuario');
const fs = require('fs-extra');
const path = require('path');
const { generarEstructuraFlutter } = require('../helpers/flutter-generator');
const archiver = require('archiver');

// --- Importamos módulos para ejecutar comandos de terminal ---
const { exec: execCallback } = require('child_process');
const util = require('util');
const exec = util.promisify(execCallback); // Versión de 'exec' que usa promesas


// Actualizar el canvas de un grupo
const actualizarCanvas = async (req, res = response) => {
    try {
        const grupoId = req.params.id;
        const { contenidoCanvas, clientId = 'unknown' } = req.body;

        // Buscar el grupo
        const grupo = await Grupo.findById(grupoId);

        if (!grupo) {
            return res.status(404).json({
                ok: false,
                msg: 'Grupo no encontrado'
            });
        }

        // Aceptar tanto la estructura nueva (tables/relationships) como la antigua (components)
        let contenidoCanvasValido;

        if (contenidoCanvas.tables) {
            // Estructura nueva
            contenidoCanvasValido = {
                tables: contenidoCanvas.tables || [],
                relationships: contenidoCanvas.relationships || [],
                canvasWidth: contenidoCanvas.canvasWidth || 1000,
                canvasHeight: contenidoCanvas.canvasHeight || 2000,
                lastUpdated: new Date(),
                lastUpdatedBy: req.uid
            };
        } else if (contenidoCanvas.components) {
            // Estructura antigua - convertir a nueva
            contenidoCanvasValido = {
                tables: contenidoCanvas.components || [],
                relationships: contenidoCanvas.relationships || [],
                canvasWidth: contenidoCanvas.canvasWidth || 1000,
                canvasHeight: contenidoCanvas.canvasHeight || 2000,
                lastUpdated: new Date(),
                lastUpdatedBy: req.uid
            };
        } else {
            // Estructura vacía por defecto
            contenidoCanvasValido = {
                tables: [],
                relationships: [],
                canvasWidth: 1000,
                canvasHeight: 2000,
                lastUpdated: new Date(),
                lastUpdatedBy: req.uid
            };
        }

        // Actualizar el contenido del canvas
        grupo.contenidoCanvas = contenidoCanvasValido;
        await grupo.save();

        // Emitir el evento a todos en la sala del grupo
        if (req.io) {
            req.io.to(grupoId).emit('diagram:updated', {
                groupId: grupoId,
                tables: contenidoCanvasValido.tables,
                relationships: contenidoCanvasValido.relationships,
                lastUpdated: contenidoCanvasValido.lastUpdated,
                lastUpdatedBy: contenidoCanvasValido.lastUpdatedBy,
                source: 'server',
                clientId: clientId
            });
        }

        res.json({
            ok: true,
            msg: 'Canvas actualizado correctamente',
            grupo,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error al actualizar canvas:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error al actualizar canvas. Hable con el administrador'
        });
    }
};

// Nuevo endpoint para sincronización
const sincronizarCanvas = async (req, res = response) => {
    try {
        const grupoId = req.params.id;

        const grupo = await Grupo.findById(grupoId);
        if (!grupo) {
            return res.status(404).json({
                ok: false,
                msg: 'Grupo no encontrado'
            });
        }

        // Asegurar estructura válida
        const contenidoCanvas = grupo.contenidoCanvas || { tables: [], relationships: [] };

        res.json({
            ok: true,
            grupo: {
                _id: grupo._id,
                contenidoCanvas: {
                    tables: contenidoCanvas.tables || [],
                    relationships: contenidoCanvas.relationships || [],
                    canvasWidth: contenidoCanvas.canvasWidth || 1000,
                    canvasHeight: contenidoCanvas.canvasHeight || 2000,
                    lastUpdated: contenidoCanvas.lastUpdated,
                    lastUpdatedBy: contenidoCanvas.lastUpdatedBy
                }
            },
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Error en sincronizarCanvas:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error al sincronizar canvas'
        });
    }
};

// Obtener un grupo específico
const obtenerGrupo = async (req, res = response) => {
    try {
        const grupoId = req.params.id;
        const grupo = await Grupo.findById(grupoId);

        if (!grupo) {
            return res.status(404).json({
                ok: false,
                msg: 'Grupo no encontrado'
            });
        }
        
        if (!grupo.contenidoCanvas) {
            grupo.contenidoCanvas = { tables: [], relationships: [] };
        }

        res.json({
            ok: true,
            grupo
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error al obtener grupo. Hable con el administrador'
        });
    }
};


// Crear un nuevo grupo
const crearGrupo = async (req, res = response) => {
    try {
        const { nombre } = req.body;
        const uid = req.uid; // ID del usuario que viene del middleware validarJWT

        const grupo = new Grupo({
            nombre,
            creador: uid,
            contenidoCanvas: {
                tables: [],
                relationships: []
            }
        });

        await grupo.save();
        const usuario = await Usuario.findById(uid);

        res.json({
            ok: true,
            grupo: {
                ...grupo.toJSON(),
                creador: usuario
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error al crear grupo. Hable con el administrador'
        });
    }
};

// Obtener todos los grupos
const obtenerGrupos = async (req, res = response) => {
    try {
        const grupos = await Grupo.find({
            activo: true
        }).sort({ updatedAt: -1 });

        res.json({
            ok: true,
            grupos
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error al obtener grupos. Hable con el administrador'
        });
    }
};

// --- FUNCIÓN generarBackend (ACTUALIZADA) ---
// Generar el backend (proyecto Spring Boot)
const generarBackend = async (req, res = response) => {
    const grupoId = req.params.id;
    const outputDir = path.join(__dirname, '..', 'temp', `gen_${grupoId}_${Date.now()}`);

    try {
        // 1. Buscar el grupo y su contenidoCanvas
        const grupo = await Grupo.findById(grupoId);
        if (!grupo || !grupo.contenidoCanvas) {
            return res.status(404).json({
                ok: false,
                msg: 'Grupo no encontrado o sin contenido para generar.'
            });
        }

        const tables = grupo.contenidoCanvas.tables || [];
        const relationships = grupo.contenidoCanvas.relationships || [];

        if (tables.length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'No hay tablas en el diagrama para generar el código.'
            });
        }

        // 2. CREAR TODOS LOS DIRECTORIOS PRIMERO
        console.log('Creando directorio base:', outputDir);
        await fs.ensureDir(outputDir);

        const projectName = (grupo.nombre || 'demo').replace(/\s+/g, '');
        const packagePath = `com/example/${projectName.toLowerCase()}`;

        // Definir todas las rutas de directorio
        const mainJavaPath = path.join(outputDir, 'src', 'main', 'java', packagePath);
        const entityJavaPath = path.join(outputDir, 'src', 'main', 'java', packagePath, 'entities');
        const repositoryJavaPath = path.join(outputDir, 'src', 'main', 'java', packagePath, 'repositories');
        const serviceJavaPath = path.join(outputDir, 'src', 'main', 'java', packagePath, 'services');
        const controllerJavaPath = path.join(outputDir, 'src', 'main', 'java', packagePath, 'controllers');
        const resourcesDir = path.join(outputDir, 'src', 'main', 'resources');

        // Crear directorios necesarios
        await fs.ensureDir(mainJavaPath);
        await fs.ensureDir(entityJavaPath);
        await fs.ensureDir(repositoryJavaPath);
        await fs.ensureDir(serviceJavaPath);
        await fs.ensureDir(controllerJavaPath);
        await fs.ensureDir(resourcesDir);

        // 3. Generar pom.xml
        const pomContent = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.5</version>
        <relativePath/>
    </parent>
    <groupId>com.example</groupId>
    <artifactId>${projectName}</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>${projectName}</name>
    <description>Proyecto generado automáticamente</description>
    <properties>
        <java.version>11</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>`;
        await fs.writeFile(path.join(outputDir, 'pom.xml'), pomContent);

        // 4. Generar application.properties
        const appProperties = `spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=true`;
        await fs.writeFile(path.join(resourcesDir, 'application.properties'), appProperties);

        // 5. Generar clase principal de Spring Boot
        const mainClassName = `${projectName.charAt(0).toUpperCase() + projectName.slice(1)}Application`;
        const mainClassContent = `
package ${packagePath.replace(/\//g, '.')};
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@SpringBootApplication
public class ${mainClassName} {
    public static void main(String[] args) {
        SpringApplication.run(${mainClassName}.class, args);
    }
}`;
        await fs.writeFile(path.join(mainJavaPath, `${mainClassName}.java`), mainClassContent);

        // 6. Mapa para almacenar entidades
        const entityContents = new Map();
        const tableMap = new Map(tables.map(t => [t.id, t]));

        // 7. Generar entidades
        console.log('Generando entidades...');
        for (const table of tables) {
            if (!table.name) continue; 
            const entityName = table.name || `Table${table.id.slice(-4)}`;
            let imports = new Set(['javax.persistence.*']);
            let attributes = '';

            const pkColumn = table.columns.find(col => col.constraints && col.constraints.includes('PK'));
            if (pkColumn) {
                attributes += `    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long ${pkColumn.name || 'id'};\n\n`;
            } else {
                attributes += `    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n\n`;
            }

            for (const col of table.columns) {
                if (col.constraints && col.constraints.includes('PK')) continue;
                const attrName = col.name || 'campoSinNombre';
                const javaType = mapSqlTypeToJava(col.type);
                if (javaType === 'LocalDate' || javaType === 'LocalDateTime') {
                    imports.add(`java.time.${javaType}`);
                }
                attributes += `    private ${javaType} ${attrName};\n`;
            }

            entityContents.set(entityName, {
                imports,
                attributes,
                relations: '',
                extendsClass: null,
                tableId: table.id,
                manyToOneRelations: [], // Relaciones que ESTA tabla tiene (ej. Comentario -> Post)
                oneToManyRelations: []  // Relaciones que OTRAS tablas tienen con esta (ej. Post -> Comentario)
            });
        }

        // 8. Procesar relaciones (ACTUALIZADO CON LÓGICA BIDIRECCIONAL)
        console.log('Procesando relaciones...');
        for (const rel of relationships) {
            const fromTableId = rel.fromTableId || rel.fromComponentId;
            const toTableId = rel.toTableId || rel.endComponentId;
            const startTable = tableMap.get(fromTableId);
            const endTable = tableMap.get(toTableId);

            if (!startTable || !endTable) continue;

            const startEntityName = startTable.name || `Table${startTable.id.slice(-4)}`;
            const endEntityName = endTable.name || `Table${endTable.id.slice(-4)}`;

            const startEntity = entityContents.get(startEntityName);
            const endEntity = entityContents.get(endEntityName);

            if (!startEntity || !endEntity) continue;

            const endEntityNameLower = endEntityName.charAt(0).toLowerCase() + endEntityName.slice(1);
            const startEntityNameLower = startEntityName.charAt(0).toLowerCase() + startEntityName.slice(1);

            switch (rel.type) {
                case 'one-to-one':
                    startEntity.relations += `\n    @OneToOne\n    @JoinColumn(name = "${endEntityNameLower}_id")\n    private ${endEntityName} ${endEntityNameLower};`;
                    break;
                
                // --- LÓGICA CORREGIDA ---
                case 'one-to-many':
                    // Lado "Uno" (Padre, ej. Post)
                    startEntity.imports.add('java.util.List');
                    startEntity.imports.add('com.fasterxml.jackson.annotation.JsonIgnoreProperties');
                    startEntity.relations += `\n    @OneToMany(mappedBy = "${startEntityNameLower}")\n    @JsonIgnoreProperties("${startEntityNameLower}")\n    private List<${endEntityName}> ${endEntityNameLower}List;`;
                    
                    // Lado "Muchos" (Hijo, ej. Comentario)
                    endEntity.imports.add('com.fasterxml.jackson.annotation.JsonIgnoreProperties');
                    endEntity.relations += `\n    @ManyToOne\n    @JoinColumn(name = "${startEntityNameLower}_id")\n    @JsonIgnoreProperties("${endEntityNameLower}List")\n    private ${startEntityName} ${startEntityNameLower};`;
                    
                    // Informar a los generadores de repo/controller
                    endEntity.manyToOneRelations.push({
                        parentModel: startEntityName, 
                        parentName: startEntityNameLower 
                    });
                    break;

                // --- LÓGICA CORREGIDA ---
                case 'many-to-one':
                    // Lado "Muchos" (Hijo, ej. Comentario)
                    startEntity.imports.add('com.fasterxml.jackson.annotation.JsonIgnoreProperties');
                    startEntity.relations += `\n    @ManyToOne\n    @JoinColumn(name = "${endEntityNameLower}_id")\n    @JsonIgnoreProperties("${startEntityNameLower}List")\n    private ${endEntityName} ${endEntityNameLower};`;
                    
                    // Lado "Uno" (Padre, ej. Post)
                    endEntity.imports.add('java.util.List');
                    endEntity.imports.add('com.fasterxml.jackson.annotation.JsonIgnoreProperties');
                    endEntity.relations += `\n    @OneToMany(mappedBy = "${endEntityNameLower}")\n    @JsonIgnoreProperties("${endEntityNameLower}")\n    private List<${startEntityName}> ${startEntityNameLower}List;`;

                    // Informar a los generadores de repo/controller
                    startEntity.manyToOneRelations.push({
                        parentModel: endEntityName,
                        parentName: endEntityNameLower
                    });
                    break;
                // --- FIN LÓGICA CORREGIDA ---

                case 'many-to-many':
                    startEntity.imports.add('java.util.List');
                    startEntity.relations += `\n    @ManyToMany\n    private List<${endEntityName}> ${endEntityNameLower}List;`;
                    break;
                case 'inheritance':
                    startEntity.extendsClass = endEntityName;
                    break;
                case 'composition':
                    startEntity.imports.add('java.util.List');
                    startEntity.imports.add('javax.persistence.CascadeType');
                    startEntity.relations += `\n    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)\n    private List<${endEntityName}> ${endEntityNameLower}List;`;
                    break;
                case 'aggregation':
                case 'association':
                    startEntity.imports.add('java.util.List');
                    startEntity.relations += `\n    @OneToMany\n    private List<${endEntityName}> ${endEntityNameLower}List;`;
                    break;
                default:
                    continue;
            }
        }

        // 9. Escribir archivos de entidad
        console.log('Escribiendo archivos de entidad...');
        for (const [entityName, content] of entityContents.entries()) {
            let gettersAndSetters = '\n    // Getters y Setters\n';
            const allFields = (content.attributes + content.relations).trim();
            const fieldRegex = /private\s+([\w<>\[\]]+)\s+([\w]+);/g;
            let match;

            while ((match = fieldRegex.exec(allFields)) !== null) {
                const fieldType = match[1];
                const fieldName = match[2];
                const capitalizedFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
                gettersAndSetters += `\n    public ${fieldType} get${capitalizedFieldName}() { return this.${fieldName}; }`;
                gettersAndSetters += `\n    public void set${capitalizedFieldName}(${fieldType} ${fieldName}) { this.${fieldName} = ${fieldName}; }\n`;
            }

            const importStatements = Array.from(content.imports).map(imp => `import ${imp};`).join('\n');
            const extendsClause = content.extendsClass ? ` extends ${content.extendsClass}` : '';
            const finalContent = `package ${packagePath.replace(/\//g, '.')}.entities;
${importStatements.trim()}
@Entity
public class ${entityName}${extendsClause} {
${(content.attributes + content.relations).trim()}
    public ${entityName}() {}
${gettersAndSetters}
}`;
            await fs.writeFile(path.join(entityJavaPath, `${entityName}.java`), finalContent);
        }

        // 10. Generar repositories (ACTUALIZADO)
        console.log('Generando repositories...');
        for (const [entityName, content] of entityContents.entries()) {
            
            let findByMethods = '';
            if (content.manyToOneRelations.length > 0) {
                for (const rel of content.manyToOneRelations) {
                    const parentModel = rel.parentModel;
                    if (!content.imports.has('java.util.List')) {
                        content.imports.add('java.util.List');
                    }
                    findByMethods += `
    // Buscar por ${parentModel}
    List<${entityName}> findBy${parentModel}Id(Long ${rel.parentName}Id);
`;
                }
            }

            const repositoryContent = `package ${packagePath.replace(/\//g, '.')}.repositories;

import ${packagePath.replace(/\//g, '.')}.entities.${entityName};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ${entityName}Repository extends JpaRepository<${entityName}, Long> {
${findByMethods}
}`;
            await fs.writeFile(path.join(repositoryJavaPath, `${entityName}Repository.java`), repositoryContent);
        }

        // 11. Generar servicios básicos (ACTUALIZADO)
        console.log('Generando servicios...');
        for (const [entityName, content] of entityContents.entries()) {
            
            let serviceFindByMethods = '';
            if (content.manyToOneRelations.length > 0) {
                for (const rel of content.manyToOneRelations) {
                    const parentModel = rel.parentModel;
                    serviceFindByMethods += `
    public List<${entityName}> findBy${parentModel}Id(Long ${rel.parentName}Id) {
        return repository.findBy${parentModel}Id(${rel.parentName}Id);
    }
`;
                }
            }

            const serviceContent = `package ${packagePath.replace(/\//g, '.')}.services;

import ${packagePath.replace(/\//g, '.')}.entities.${entityName};
import ${packagePath.replace(/\//g, '.')}.repositories.${entityName}Repository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ${entityName}Service {
    
    @Autowired
    private ${entityName}Repository repository;
    
    public List<${entityName}> findAll() { return repository.findAll(); }
    public Optional<${entityName}> findById(Long id) { return repository.findById(id); }
    public ${entityName} save(${entityName} entity) { return repository.save(entity); }
    public void deleteById(Long id) { repository.deleteById(id); }

${serviceFindByMethods}
}`;
            await fs.writeFile(path.join(serviceJavaPath, `${entityName}Service.java`), serviceContent);
        }

        // 12. Generar controladores básicos (ACTUALIZADO)
        console.log('Generando controladores...');
        for (const [entityName, content] of entityContents.entries()) {
            const entityNameLower = entityName.toLowerCase();
            const controllerName = `${entityName}Controller`;
            const serviceName = `${entityName}Service`;

            let controllerFindByEndpoints = '';
            
            if (content.manyToOneRelations.length > 0) {
                 for (const rel of content.manyToOneRelations) {
                    controllerFindByEndpoints += `
    @GetMapping("/by-${rel.parentName}/{${rel.parentName}Id}")
    public List<${entityName}> getBy${rel.parentModel}Id(@PathVariable Long ${rel.parentName}Id) {
        return service.findBy${rel.parentModel}Id(${rel.parentName}Id);
    }
`;
                 }
            }

            const controllerContent = `package ${packagePath.replace(/\//g, '.')}.controllers;

import ${packagePath.replace(/\//g, '.')}.entities.${entityName};
import ${packagePath.replace(/\//g, '.')}.services.${serviceName};
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/${entityNameLower}")
@CrossOrigin(origins = "*")
public class ${controllerName} {
    
    @Autowired
    private ${serviceName} service;
    
    @GetMapping
    public List<${entityName}> getAll() {
        return service.findAll();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<${entityName}> getById(@PathVariable Long id) {
        Optional<${entityName}> entity = service.findById(id);
        return entity.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ${entityName} create(@RequestBody ${entityName} entity) {
        return service.save(entity);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<${entityName}> update(@PathVariable Long id, @RequestBody ${entityName} entityDetails) {
        Optional<${entityName}> existingEntity = service.findById(id);
        if (existingEntity.isPresent()) {
            // Actualización simple: reemplaza el objeto encontrado con los detalles nuevos (excepto el id)
            // Asumimos que la PK se llama 'id'
            // entityDetails.setId(id); 
            // Esto es peligroso si la PK no se llama 'id'.
            // Una mejor práctica (aunque simple) es solo guardar el objeto que llega.
            return ResponseEntity.ok(service.save(entityDetails));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (service.findById(id).isPresent()) {
            service.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

${controllerFindByEndpoints}
}`;
            await fs.writeFile(path.join(controllerJavaPath, `${controllerName}.java`), controllerContent);
        }

        // 13. Comprimir y enviar
        await new Promise((resolve, reject) => {
            const zipPath = path.join(__dirname, '..', 'temp', `${projectName}.zip`);
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                console.log('Archivo ZIP creado exitosamente');
                res.download(zipPath, `${projectName}.zip`, (err) => {
                    if (err) {
                        console.error("Error al enviar el archivo:", err);
                    }
                    fs.remove(outputDir).catch(console.error);
                    fs.remove(zipPath).catch(console.error);
                    resolve();
                });
            });

            archive.on('error', (err) => reject(err));
            archive.pipe(output);
            archive.directory(outputDir, false);
            archive.finalize();
        });

    } catch (error) {
        console.error('Error en generarBackend:', error);
        await fs.remove(outputDir).catch(console.error);
        res.status(500).json({
            ok: false,
            msg: `Error al generar el backend: ${error.message}`
        });
    }
};

// --- FUNCIÓN generarFrontendFlutter (ACTUALIZADA) ---
const generarFrontendFlutter = async (req, res = response) => {
    const grupoId = req.params.id;
    let outputDir; // Definido aquí para que esté en el scope del try/catch/finally

    try {
        // 1. Buscar el grupo y su contenido
        const grupo = await Grupo.findById(grupoId);
        if (!grupo || !grupo.contenidoCanvas) {
            return res.status(404).json({ ok: false, msg: 'Grupo no encontrado o sin contenido.' });
        }

        const tables = grupo.contenidoCanvas.tables || [];
        const relationships = grupo.contenidoCanvas.relationships || [];
        
        if (tables.length === 0) {
            return res.status(400).json({ ok: false, msg: 'No hay tablas para generar el frontend.' });
        }

        const projectName = (grupo.nombre || 'flutter_app').replace(/\s+/g, '').toLowerCase();
        
        // El directorio de salida ahora incluye el nombre del proyecto
        outputDir = path.join(__dirname, '..', 'temp', `flutter_gen_${projectName}_${Date.now()}`);

        // 2. Crear el directorio de salida
        await fs.ensureDir(outputDir);
        console.log(`Directorio temporal creado en: ${outputDir}`);

        // 3. Ejecutar 'flutter create .' DENTRO de ese directorio
        const flutterCommand = 'flutter create .';
        console.log(`Ejecutando '${flutterCommand}' en ${outputDir}`);
        
        // Usamos { cwd } para definir el directorio de trabajo del comando
        const { stdout, stderr } = await exec(flutterCommand, { cwd: outputDir });
        
        console.log('Flutter create stdout:', stdout);
        if (stderr && stderr.length > 0) {
            console.warn('Flutter create stderr:', stderr);
        }
        console.log('Proyecto Flutter base creado exitosamente.');
        
        // 4. Llamar a la función de generación de código (sobrescribirá lib/ y pubspec.yaml)
        await generarEstructuraFlutter(outputDir, projectName, tables, relationships);

        // 5. Comprimir y enviar el archivo
        await new Promise((resolve, reject) => {
            const zipPath = path.join(__dirname, '..', 'temp', `${projectName}_flutter.zip`);
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                console.log('Archivo ZIP de Flutter creado exitosamente');
                res.download(zipPath, `${projectName}_flutter.zip`, (err) => {
                    if (err) {
                        console.error("Error al enviar el archivo de Flutter:", err);
                    }
                    // Limpiar archivos temporales
                    fs.remove(outputDir).catch(console.error);
                    fs.remove(zipPath).catch(console.error);
                    resolve();
                });
            });

            archive.on('error', (err) => {
                console.error('Error al crear archivo ZIP de Flutter:', err);
                reject(err);
            });

            archive.pipe(output);
            archive.directory(outputDir, false); 
            archive.finalize();
        });

    } catch (error) {
        console.error('Error en generarFrontendFlutter:', error);
        // Limpiar en caso de error
        if (outputDir) {
            await fs.remove(outputDir).catch(console.error);
        }
        res.status(500).json({
            ok: false,
            msg: `Error al generar el frontend de Flutter: ${error.message}`
        });
    }
};

// Función auxiliar para mapear tipos SQL a Java
function mapSqlTypeToJava(sqlType) {
    if (!sqlType) return 'String';

    const type = sqlType.toString().toUpperCase();

    if (type.includes('INT')) return 'Long';
    if (type.includes('VARCHAR') || type.includes('TEXT') || type.includes('CHAR')) return 'String';
    if (type.includes('DECIMAL') || type.includes('FLOAT') || type.includes('DOUBLE')) return 'Double';
    if (type.includes('BOOLEAN') || type.includes('BOOL')) return 'Boolean';
    if (type.includes('DATE')) return 'java.time.LocalDate';
    if (type.includes('TIMESTAMP') || type.includes('DATETIME')) return 'java.time.LocalDateTime';

    return 'String';
}

module.exports = {
    crearGrupo,
    obtenerGrupos,
    obtenerGrupo,
    actualizarCanvas,
    generarBackend,
    generarFrontendFlutter,
    sincronizarCanvas
}