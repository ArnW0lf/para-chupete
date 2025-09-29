const { response } = require("express");
const Grupo = require('../models/grupos');
const Usuario = require('../models/usuario');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');


// Actualizar el canvas de un grupo - Versión corregida
const actualizarCanvas = async (req, res = response) => {
    try {
        const grupoId = req.params.id;
        const { contenidoCanvas, clientId = 'unknown' } = req.body;

        console.log('Datos recibidos para guardar:', {
            grupoId,
            clientId,
            tieneComponents: !!contenidoCanvas?.components,
            tieneTables: !!contenidoCanvas?.tables
        });

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

            console.log(`Evento diagram:updated emitido a grupo ${grupoId}`);
        }

        console.log('Canvas guardado exitosamente');

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
// Obtener un grupo específico - Versión corregida
const obtenerGrupo = async (req, res = response) => {
    try {
        const grupoId = req.params.id;

        // Buscar el grupo
        const grupo = await Grupo.findById(grupoId);

        if (!grupo) {
            return res.status(404).json({
                ok: false,
                msg: 'Grupo no encontrado'
            });
        }

        // Asegurar que la respuesta tenga la estructura moderna
        if (!grupo.contenidoCanvas) {
            // Si no hay contenido, inicializarlo
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

        // Crear grupo en la BD con el contenidoCanvas por defecto
        const grupo = new Grupo({
            nombre,
            creador: uid,
            contenidoCanvas: {
                tables: [],
                relationships: []
            }
        });

        await grupo.save();

        // Obtener información del creador para la respuesta
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
        // Buscar todos los grupos activos
        const grupos = await Grupo.find({
            activo: true
        }).sort({ updatedAt: -1 }); // Más recientes primero

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

        // Usar 'tables' directamente
        const tables = grupo.contenidoCanvas.tables || [];
        const relationships = grupo.contenidoCanvas.relationships || [];

        console.log('Tablas encontradas:', tables.length);
        console.log('Relaciones encontradas:', relationships.length);

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
        console.log('Creando estructura de directorios...');
        await fs.ensureDir(mainJavaPath);
        await fs.ensureDir(entityJavaPath);
        await fs.ensureDir(repositoryJavaPath);
        await fs.ensureDir(serviceJavaPath);
        await fs.ensureDir(controllerJavaPath);
        await fs.ensureDir(resourcesDir);

        console.log('Estructura de directorios creada exitosamente');

        // 3. Generar pom.xml - PRIMERO CREAR EL ARCHIVO EN EL DIRECTORIO CORRECTO
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

        const pomPath = path.join(outputDir, 'pom.xml');
        console.log('Escribiendo pom.xml en:', pomPath);
        await fs.writeFile(pomPath, pomContent);
        console.log('pom.xml creado exitosamente');

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

        const mainClassPath = path.join(mainJavaPath, `${mainClassName}.java`);
        console.log('Escribiendo clase principal en:', mainClassPath);
        await fs.writeFile(mainClassPath, mainClassContent);
        console.log('Clase principal creada exitosamente');

        // 6. Mapa para almacenar entidades
        const entityContents = new Map();
        const tableMap = new Map(tables.map(t => [t.id, t]));

        // 7. Generar entidades
        console.log('Generando entidades...');
        for (const table of tables) {
            // Asegurar nombre válido para la entidad
            const entityName = table.name || `Table${table.id.slice(-4)}`;
            let imports = new Set(['javax.persistence.*']);
            let attributes = '';

            // Buscar columna PK
            const pkColumn = table.columns.find(col => col.constraints && col.constraints.includes('PK'));

            if (pkColumn) {
                attributes += `    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long ${pkColumn.name || 'id'};\n\n`;
            } else {
                // Si no hay PK, crear una por defecto
                attributes += `    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n\n`;
            }

            // Generar atributos para las demás columnas
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
                tableId: table.id
            });
        }

        // 8. Procesar relaciones
        console.log('Procesando relaciones...');
        for (const rel of relationships) {
            console.log('Procesando relación:', rel);

            // CORRECCIÓN: Usar los nombres correctos que envía el frontend
            const startTable = tableMap.get(rel.fromTableId || rel.fromComponentId);
            const endTable = tableMap.get(rel.toTableId || rel.endComponentId);

            if (!startTable || !endTable) {
                console.log('Tabla de origen o destino no encontrada');
                continue;
            }

            const startEntityName = startTable.name || `Table${startTable.id.slice(-4)}`;
            const endEntityName = endTable.name || `Table${endTable.id.slice(-4)}`;

            const startEntity = entityContents.get(startEntityName);
            const endEntity = entityContents.get(endEntityName);

            if (!startEntity || !endEntity) {
                console.log('Entidad de origen o destino no encontrada en el mapa');
                continue;
            }

            const endEntityNameLower = endEntityName.charAt(0).toLowerCase() + endEntityName.slice(1);
            let annotation = '';

            switch (rel.type) {
                case 'one-to-one':
                    annotation = `\n    @OneToOne\n    private ${endEntityName} ${endEntityNameLower};`;
                    break;
                case 'one-to-many':
                    startEntity.imports.add('java.util.List');
                    annotation = `\n    @OneToMany\n    private List<${endEntityName}> ${endEntityNameLower}List;`;
                    break;
                case 'many-to-one':
                    annotation = `\n    @ManyToOne\n    private ${endEntityName} ${endEntityNameLower};`;
                    break;
                case 'many-to-many':
                    startEntity.imports.add('java.util.List');
                    annotation = `\n    @ManyToMany\n    private List<${endEntityName}> ${endEntityNameLower}List;`;
                    break;
                default:
                    console.log('Tipo de relación no reconocido:', rel.type);
                    continue;
            }

            startEntity.relations += annotation;
        }

        // 9. Escribir archivos de entidad
        console.log('Escribiendo archivos de entidad...');
        for (const [entityName, content] of entityContents.entries()) {
            const importStatements = Array.from(content.imports)
                .map(imp => imp.endsWith('*') ? `import ${imp};` : `import ${imp};`)
                .join('\n');

            const finalContent = `package ${packagePath.replace(/\//g, '.')}.entities;

${importStatements}

@Entity
public class ${entityName} {
${content.attributes}${content.relations}
    
    // Constructores
    public ${entityName}() {}
    
    // Getters y Setters
    // (Se pueden generar con Lombok o manualmente)
}`;

            const entityPath = path.join(entityJavaPath, `${entityName}.java`);
            await fs.writeFile(entityPath, finalContent);
            console.log(`Entidad ${entityName} creada en: ${entityPath}`);
        }

        // 10. Generar repositories
        console.log('Generando repositories...');
        for (const [entityName] of entityContents.entries()) {
            const repositoryContent = `package ${packagePath.replace(/\//g, '.')}.repositories;

import ${packagePath.replace(/\//g, '.')}.entities.${entityName};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ${entityName}Repository extends JpaRepository<${entityName}, Long> {
}`;

            const repoPath = path.join(repositoryJavaPath, `${entityName}Repository.java`);
            await fs.writeFile(repoPath, repositoryContent);
            console.log(`Repository ${entityName}Repository creado en: ${repoPath}`);
        }

        // 11. Generar servicios básicos
        console.log('Generando servicios...');
        for (const [entityName] of entityContents.entries()) {
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
    
    public List<${entityName}> findAll() {
        return repository.findAll();
    }
    
    public Optional<${entityName}> findById(Long id) {
        return repository.findById(id);
    }
    
    public ${entityName} save(${entityName} entity) {
        return repository.save(entity);
    }
    
    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}`;

            const servicePath = path.join(serviceJavaPath, `${entityName}Service.java`);
            await fs.writeFile(servicePath, serviceContent);
            console.log(`Service ${entityName}Service creado en: ${servicePath}`);
        }

        // 12. Generar controladores básicos (VERSIÓN COMPLETAMENTE CORREGIDA)
        console.log('Generando controladores...');
        for (const [entityName] of entityContents.entries()) {
            const entityNameLower = entityName.toLowerCase();

            // DEFINIR TODAS LAS VARIABLES NECESARIAS
            const controllerName = `${entityName}Controller`;
            const serviceName = `${entityName}Service`;
            const repositoryName = `${entityName}Repository`;

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
            ${entityName} entity = existingEntity.get();
            // Actualizar campos aquí
            return ResponseEntity.ok(service.save(entity));
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
}`;

            const controllerPath = path.join(controllerJavaPath, `${controllerName}.java`);
            await fs.writeFile(controllerPath, controllerContent);
            console.log(`Controller ${controllerName} creado en: ${controllerPath}`);
        }

        // 13. Comprimir y enviar
        // Envolvemos la lógica de compresión en una Promise para un mejor manejo de errores
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
                    // Limpiar archivos temporales después de la descarga
                    fs.remove(outputDir).catch(console.error);
                    fs.remove(zipPath).catch(console.error);
                    resolve();
                });
            });

            archive.on('error', (err) => {
                console.error('Error al crear archivo ZIP:', err);
                reject(err);
            });

            archive.pipe(output);
            archive.directory(outputDir, false);
            archive.finalize();
        });

    } catch (error) {
        console.error('Error en generarBackend:', error);
        // Limpiar en caso de error
        await fs.remove(outputDir).catch(console.error);

        res.status(500).json({
            ok: false,
            msg: `Error al generar el backend: ${error.message}`
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
    if (type.includes('DATE')) return 'LocalDate';
    if (type.includes('TIMESTAMP') || type.includes('DATETIME')) return 'LocalDateTime';

    return 'String';
}

module.exports = {
    crearGrupo,
    obtenerGrupos,
    obtenerGrupo,
    actualizarCanvas,
    generarBackend,
    sincronizarCanvas // Exportar la nueva función
}
// ...existing code...