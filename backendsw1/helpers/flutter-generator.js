const fs = require('fs-extra');
const path = require('path');

/**
 * Genera la estructura completa de un proyecto Flutter CRUD con manejo de relaciones.
 * @param {string} outputDir - El directorio donde se generará el proyecto.
 * @param {string} projectName - El nombre del proyecto (ej. 'my_app').
 * @param {Array} tables - El array de tablas del diagrama.
 * @param {Array} relationships - El array de relaciones del diagrama.
 */
const generarEstructuraFlutter = async (outputDir, projectName, tables, relationships) => {
    console.log(`Iniciando generación de Flutter para: ${projectName}`);

    // --- LÓGICA DE PROCESAMIENTO DE RELACIONES (CORREGIDA) ---
    const tableMap = new Map(tables.map(t => [t.id, t]));

    for (const table of tables) {
        table.formRelations = []; // Para Dropdowns en el Form (Many-to-One)
        table.detailSubLists = []; // Para Sub-Listas en el Detalle (One-to-Many, Many-to-Many)
        table.fetchByRelations = []; // Para generar métodos de servicio
    }

    if (relationships) {
        for (const rel of relationships) {
            const fromTableId = rel.fromTableId || rel.fromComponentId;
            const toTableId = rel.toTableId || rel.endComponentId;

            const fromTable = tableMap.get(fromTableId);
            const toTable = tableMap.get(toTableId);

            if (!fromTable || !toTable) continue;

            // Nombres del lado "Hacia" (ej. Usuario)
            const targetModel = toPascalCase(toTable.name);
            const targetName = toCamelCase(targetModel);
            const targetFileName = toSnakeCase(toTable.name);

            // Nombres del lado "Desde" (ej. Post)
            const parentModel = toPascalCase(fromTable.name);
            const parentName = toCamelCase(parentModel);
            const parentFileName = toSnakeCase(fromTable.name);


            if (rel.type === 'many-to-one' || rel.type === 'one-to-one') {
                // 'from' (ej. Post) tiene un dropdown para 'to' (ej. Usuario)
                fromTable.formRelations.push({
                    type: rel.type,
                    targetModel: targetModel,
                    targetName: targetName,
                    targetFileName: targetFileName
                });
                // El servicio de 'Post' necesita un 'fetchPostsByUsuarioId'
                fromTable.fetchByRelations.push({ 
                    parentModel: targetModel, 
                    parentName: targetName 
                });

            } else if (rel.type === 'one-to-many') {
                // 'from' (ej. Post) tendrá una sub-lista de 'to' (ej. Comentario)
                fromTable.detailSubLists.push({
                    type: rel.type,
                    targetModel: targetModel,
                    targetNamePlural: `${targetName}s`,
                    targetFileName: targetFileName,
                    parentName: parentName
                });
                // El servicio de 'Comentario' necesita 'fetchComentariosByPostId'
                toTable.fetchByRelations.push({
                    parentModel: parentModel,
                    parentName: parentName
                });

            } else if (rel.type === 'many-to-many') {
                // 'from' (ej. Post) tendrá sub-lista de 'to' (ej. Categoria)
                fromTable.detailSubLists.push({
                    type: rel.type,
                    targetModel: targetModel,
                    targetNamePlural: `${targetName}s`,
                    targetFileName: targetFileName,
                    parentName: parentName
                });
                // 'to' (ej. Categoria) tendrá sub-lista de 'from' (ej. Post)
                toTable.detailSubLists.push({
                    type: rel.type,
                    targetModel: parentModel,
                    targetNamePlural: `${parentName}s`,
                    targetFileName: parentFileName,
                    parentName: targetName
                });
                
                // El servicio de 'Post' necesita 'fetchPostsByCategoriaId'
                fromTable.fetchByRelations.push({ 
                    parentModel: targetModel, 
                    parentName: targetName 
                });
                // El servicio de 'Categoria' necesita 'fetchCategoriasByPostId'
                toTable.fetchByRelations.push({
                    parentModel: parentModel,
                    parentName: parentName
                });
            }
        }
    }
    // --- FIN LÓGICA DE RELACIONES ---

    // 1. Crear estructura de directorios
    const libDir = path.join(outputDir, 'lib');
    const modelsDir = path.join(libDir, 'models');
    const pagesDir = path.join(libDir, 'pages');
    const servicesDir = path.join(libDir, 'services');

    await fs.ensureDir(modelsDir);
    await fs.ensureDir(pagesDir);
    await fs.ensureDir(servicesDir);

    // 2. Generar pubspec.yaml
    await generarPubspec(outputDir, projectName);

    // 3. Generar main.dart
    await generarMain(libDir, projectName);

    // 4. Generar HomePage con el Drawer de navegación
    await generarHomePage(pagesDir, projectName, tables);

    // 5. Generar modelos, servicios y páginas CRUD para cada tabla
    for (const table of tables) {
        if (!table.name) continue;

        const modelName = toPascalCase(table.name);
        const fileName = toSnakeCase(table.name);

        await generarModelo(modelsDir, modelName, fileName, table.columns, table.formRelations);
        await generarServicio(servicesDir, modelName, fileName, table.fetchByRelations); 
        await generarPaginaLista(pagesDir, modelName, fileName, table.columns, projectName);
        await generarPaginaDetalle(pagesDir, modelName, fileName, table.columns, table.detailSubLists, projectName);
        await generarPaginaFormulario(pagesDir, modelName, fileName, table.columns, table.formRelations, projectName);
    }

    console.log('Generación de Flutter completada.');
};

// --- Generador de pubspec.yaml ---
const generarPubspec = async (outputDir, projectName) => {
    const content = `
name: ${projectName}
description: A new Flutter project generated from a diagram.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=2.19.0 <3.0.0'

dependencies:
  flutter:
    sdk: flutter
  http: ^0.13.5
  provider: ^6.0.5

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0

flutter:
  uses-material-design: true
`;
    await fs.writeFile(path.join(outputDir, 'pubspec.yaml'), content.trim());
};

// --- Generador de main.dart ---
const generarMain = async (libDir, projectName) => {
    const content = `
import 'package:flutter/material.dart';
import 'package:${projectName}/pages/home_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${toPascalCase(projectName)}',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const HomePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}
`;
    await fs.writeFile(path.join(libDir, 'main.dart'), content.trim());
};

// --- Generador de home_page.dart ---
const generarHomePage = async (pagesDir, projectName, tables) => {
    const imports = tables
        .map(t => `import 'package:${projectName}/pages/${toSnakeCase(t.name)}_list_page.dart';`)
        .join('\n');

    const drawerTiles = tables
        .map(t => {
            const modelName = toPascalCase(t.name);
            return `
            ListTile(
              leading: const Icon(Icons.list_alt),
              title: const Text('${modelName}s'),
              onTap: () {
                Navigator.pop(context); // Cerrar el drawer
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const ${modelName}ListPage()),
                );
              },
            ),`;
        })
        .join('\n');

    const content = `
import 'package:flutter/material.dart';
${imports}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Menú Principal'),
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(
                color: Colors.blue,
              ),
              child: Text(
                'Navegación',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                ),
              ),
            ),
${drawerTiles}
          ],
        ),
      ),
      body: const Center(
        child: Text('Bienvenido. Selecciona una opción del menú.'),
      ),
    );
  }
}
`;
    await fs.writeFile(path.join(pagesDir, 'home_page.dart'), content.trim());
};

// --- Generador de Modelo (Maneja many-to-one) ---
const generarModelo = async (modelsDir, modelName, fileName, columns, relations = []) => {
    
    const columnFields = columns
        .map(col => `  final ${mapToDartType(col.type)}? ${toCamelCase(col.name)};`)
        .join('\n');

    const relationFields = relations
        .map(rel => `  final ${rel.targetModel}? ${rel.targetName};`)
        .join('\n');
    const fields = [columnFields, relationFields].filter(Boolean).join('\n');

    const columnConstructorParams = columns
        .map(col => `    this.${toCamelCase(col.name)},`)
        .join('\n');
    const relationConstructorParams = relations
        .map(rel => `    this.${rel.targetName},`)
        .join('\n');
    const constructorParams = [columnConstructorParams, relationConstructorParams].filter(Boolean).join('\n');

    const columnFromJson = columns
        .map(col => {
            const camelName = toCamelCase(col.name);
            const jsonName = col.name;
            const dartType = mapToDartType(col.type);

            if (dartType === 'DateTime') {
                return `      ${camelName}: json['${jsonName}'] != null ? DateTime.parse(json['${jsonName}']) : null,`;
            }
            if (dartType === 'double') {
                return `      ${camelName}: (json['${jsonName}'] as num?)?.toDouble(),`;
            }
             if (dartType === 'int') {
                return `      ${camelName}: (json['${jsonName}'] as num?)?.toInt(),`;
            }
            return `      ${camelName}: json['${jsonName}'],`;
        })
        .join('\n');
        
    const relationFromJson = relations
        .map(rel => `      ${rel.targetName}: json['${rel.targetName}'] != null ? ${rel.targetModel}.fromJson(json['${rel.targetName}']) : null,`)
        .join('\n');
    const fromJson = [columnFromJson, relationFromJson].filter(Boolean).join('\n');

    const columnToJson = columns
        .map(col => {
             const camelName = toCamelCase(col.name);
             const jsonName = col.name;
             const dartType = mapToDartType(col.type);

             if(dartType === 'DateTime') {
                return `      '${jsonName}': ${camelName}?.toIso8601String(),`;
             }
            return `      '${jsonName}': ${camelName},`;
        })
        .join('\n');
        
    const relationToJson = relations
        .map(rel => {
            const jsonName = rel.targetName;
            const camelName = toCamelCase(rel.targetName);
            return `      '${jsonName}': ${camelName}?.toJson(),`;
        })
        .join('\n');
    const toJson = [columnToJson, relationToJson].filter(Boolean).join('\n');

    const content = `
${relations.map(rel => `import './${rel.targetFileName}.dart';`).join('\n')}

class ${modelName} {
${fields}

  ${modelName}({\n${constructorParams}\n  });

  factory ${modelName}.fromJson(Map<String, dynamic> json) {
    return ${modelName}(
${fromJson}
    );
  }

  Map<String, dynamic> toJson() {
    return {
${toJson}
    };
  }
}
`;
    await fs.writeFile(path.join(modelsDir, `${fileName}.dart`), content.trim());
};

// --- Generador de Servicio (CRUD completo + fetchByParent CORREGIDO) ---
const generarServicio = async (servicesDir, modelName, fileName, relations = []) => {
    const baseUrl = `http://localhost:8080/api/${fileName}`;

    // --- LÓGICA CORREGIDA: Usa 'relations' (que ahora es fetchByRelations) ---
    const fetchByParentMethods = relations
        .map(rel => {
            const parentModel = rel.parentModel; // Ya está en PascalCase
            const parentName = rel.parentName; // Ya está en camelCase
            
            return `
  // --- Método 6: OBTENER ${modelName}s POR ${parentModel} ID ---
  Future<List<${modelName}>> fetch${modelName}sBy${parentModel}Id(int ${parentName}Id) async {
    final response = await http.get(Uri.parse('\$_baseUrl/by-${parentName}/\${${parentName}Id}'));

    if (response.statusCode == 200) {
      List<dynamic> body = jsonDecode(response.body);
      List<${modelName}> ${fileName}s = body.map((dynamic item) => ${modelName}.fromJson(item)).toList();
      return ${fileName}s;
    } else {
      throw Exception('Failed to load ${fileName}s for ${parentModel} \$${parentName}Id');
    }
  }
`;
        })
        .join('\n');

    const content = `
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/${fileName}.dart';

class ${modelName}Service {
  final String _baseUrl = '${baseUrl}';
  final Map<String, String> _headers = {
    'Content-Type': 'application/json; charset=UTF-8'
  };

  // --- Método 1: OBTENER TODOS (Read) ---
  Future<List<${modelName}>> fetchAll${modelName}s() async {
    final response = await http.get(Uri.parse(_baseUrl));
    if (response.statusCode == 200) {
      List<dynamic> body = jsonDecode(response.body);
      List<${modelName}> ${fileName}s = body.map((dynamic item) => ${modelName}.fromJson(item)).toList();
      return ${fileName}s;
    } else {
      throw Exception('Failed to load ${fileName}s');
    }
  }

  // --- Método 2: OBTENER UNO POR ID (Read by ID) ---
  Future<${modelName}> fetch${modelName}ById(int id) async {
    final response = await http.get(Uri.parse('\$_baseUrl/\$id'));
    if (response.statusCode == 200) {
      return ${modelName}.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to load ${modelName} with id \$id');
    }
  }

  // --- Método 3: CREAR UNO (Create) ---
  Future<${modelName}> create${modelName}(${modelName} ${fileName}) async {
    var body = ${fileName}.toJson();
    body.removeWhere((key, value) => key == 'id' && value == null);
    final response = await http.post(
      Uri.parse(_baseUrl),
      headers: _headers,
      body: jsonEncode(body),
    );
    if (response.statusCode == 201 || response.statusCode == 200) {
      return ${modelName}.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to create ${modelName}. Status: \${response.statusCode}, Body: \${response.body}');
    }
  }

  // --- Método 4: ACTUALIZAR UNO (Update) ---
  Future<${modelName}> update${modelName}(int id, ${modelName} ${fileName}) async {
    final response = await http.put(
      Uri.parse('\$_baseUrl/\$id'),
      headers: _headers,
      body: jsonEncode(${fileName}.toJson()),
    );
    if (response.statusCode == 200) {
      return ${modelName}.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to update ${modelName}');
    }
  }

  // --- Método 5: ELIMINAR UNO (Delete) ---
  Future<void> delete${modelName}(int id) async {
    final response = await http.delete(
      Uri.parse('\$_baseUrl/\$id'),
    );
    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to delete ${modelName}');
    }
  }
  
${fetchByParentMethods}
}
`;
    await fs.writeFile(path.join(servicesDir, `${fileName}_service.dart`), content.trim());
};

// --- Generador de Página de Lista ---
const generarPaginaLista = async (pagesDir, modelName, fileName, columns, projectName) => {
    const pkCol = columns.find(c => c.constraints.includes('PK')) || { name: 'id' };
    let displayCol = columns.find(c => c.name.toLowerCase() === 'nombre' || c.name.toLowerCase() === 'name');
    if (!displayCol) {
       displayCol = columns.find(c => mapToDartType(c.type) === 'String' && !c.constraints.includes('PK')) || columns[1];
    }
    const displayColName = toCamelCase(displayCol?.name || 'id');
    const pkName = toCamelCase(pkCol.name || 'id');

    const content = `
import 'package:flutter/material.dart';
import 'package:${projectName}/models/${fileName}.dart';
import 'package:${projectName}/services/${fileName}_service.dart';
import 'package:${projectName}/pages/${fileName}_detail_page.dart';
import 'package:${projectName}/pages/${fileName}_form_page.dart';

class ${modelName}ListPage extends StatefulWidget {
  const ${modelName}ListPage({super.key});

  @override
  State<${modelName}ListPage> createState() => _${modelName}ListPageState();
}

class _${modelName}ListPageState extends State<${modelName}ListPage> {
  late Future<List<${modelName}>> future${modelName}s;
  final ${modelName}Service _service = ${modelName}Service();

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  void _cargarDatos() {
    setState(() {
      future${modelName}s = _service.fetchAll${modelName}s();
    });
  }

  void _navegarADetalle(int id) async {
    final resultado = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => ${modelName}DetailPage(id: id)),
    );
    if (resultado == true) {
      _cargarDatos();
    }
  }

  void _navegarAFormulario({int? id}) async {
    final resultado = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => ${modelName}FormPage(id: id)),
    );
    if (resultado == true) {
      _cargarDatos();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('${modelName}s'),
      ),
      body: FutureBuilder<List<${modelName}>>(
        future: future${modelName}s,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('\${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('No hay ${fileName}s.'));
          }
          
          final ${fileName}s = snapshot.data!;
          return ListView.builder(
            itemCount: ${fileName}s.length,
            itemBuilder: (context, index) {
              final item = ${fileName}s[index];
              return ListTile(
                title: Text(item.${displayColName}?.toString() ?? 'Sin ${displayColName}'),
                subtitle: Text('ID: \${item.${pkName}?.toString() ?? 'N/A'}'),
                onTap: () => _navegarADetalle(item.${pkName}! as int),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _navegarAFormulario(),
        tooltip: 'Crear ${modelName}',
        child: const Icon(Icons.add),
      ),
    );
  }
}
`;
    await fs.writeFile(path.join(pagesDir, `${fileName}_list_page.dart`), content.trim());
};

// --- Generador de Página de Detalle (CORREGIDO) ---
const generarPaginaDetalle = async (pagesDir, modelName, fileName, columns, subLists = [], projectName) => {
    const pkCol = columns.find(c => c.constraints.includes('PK')) || { name: 'id' };
    
    const detailFields = columns
        .map(col => {
            const camelName = toCamelCase(col.name);
            return `
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Text(
                '${toPascalCase(col.name)}: \${modelo.${camelName}?.toString() ?? 'N/A'}',
                style: const TextStyle(fontSize: 18),
              ),
            ),`;
        })
        .join('\n');

    // --- LÓGICA: Generar UI para sub-listas ---
    const subListImports = subLists
        .map(list => `
import 'package:${projectName}/models/${list.targetFileName}.dart';
import 'package:${projectName}/services/${list.targetFileName}_service.dart';
`)
        .join('');
        
    const subListServices = subLists
        .map(list => `  final _${list.targetFileName}Service = ${list.targetModel}Service();`)
        .join('\n');
        
    const subListFutures = subLists
        .map(list => `  late Future<List<${list.targetModel}>> _future${list.targetNamePlural};`)
        .join('\n');

    // --- CORRECCIÓN 1: Capitalización ---
    // (Se añade toPascalCase(list.parentName) para que coincida con el servicio)
    const loadSubListFutures = subLists
        .map(list => `    _future${list.targetNamePlural} = _${list.targetFileName}Service.fetch${list.targetModel}sBy${toPascalCase(list.parentName)}Id(widget.id);`)
        .join('\n');
        
    const subListBuilders = subLists
        .map(list => {
            return `
            const Divider(height: 30, thickness: 2),
            Text(
              '${list.targetModel}s',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            FutureBuilder<List<${list.targetModel}>>(
              future: _future${list.targetNamePlural},
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('Error al cargar ${list.targetNamePlural}: \${snapshot.error}'));
                }
                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return const Center(child: Text('No hay ${list.targetNamePlural}.'));
                }
                
                final items = snapshot.data!;
                return ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final item = items[index];
                    
                    // --- CORRECCIÓN 2: Lógica de Display Segura ---
                    final itemJson = item.toJson();
                    final String displayField;
                    if (itemJson.containsKey('nombre')) {
                      displayField = itemJson['nombre']?.toString() ?? 'N/A';
                    } else if (itemJson.containsKey('titulo')) {
                      displayField = itemJson['titulo']?.toString() ?? 'N/A';
                    } else if (itemJson.containsKey('texto')) {
                      displayField = itemJson['texto']?.toString() ?? 'N/A';
                    } else {
                      displayField = 'ID: \${itemJson['id']?.toString() ?? 'N/A'}';
                    }
                    return ListTile(
                      title: Text(displayField),
                    );
                    // --- FIN CORRECCIÓN 2 ---
                  },
                );
              },
            ),
            `;
        })
        .join('\n');
    // --- FIN LÓGICA ---

    const content = `
import 'package:flutter/material.dart';
import 'package:${projectName}/models/${fileName}.dart';
import 'package:${projectName}/services/${fileName}_service.dart';
import 'package:${projectName}/pages/${fileName}_form_page.dart';
${subListImports}

class ${modelName}DetailPage extends StatefulWidget {
  final int id;
  const ${modelName}DetailPage({super.key, required this.id});

  @override
  State<${modelName}DetailPage> createState() => _${modelName}DetailPageState();
}

class _${modelName}DetailPageState extends State<${modelName}DetailPage> {
  late Future<${modelName}> future${modelName};
  final ${modelName}Service _service = ${modelName}Service();

${subListServices}
${subListFutures}

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  void _cargarDatos() {
    setState(() {
      future${modelName} = _service.fetch${modelName}ById(widget.id);
${loadSubListFutures}
    });
  }

  void _eliminar() async {
    final bool? confirmar = await showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Confirmar Eliminación'),
          content: const Text('¿Estás seguro de que deseas eliminar este ítem?'),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancelar'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Eliminar', style: TextStyle(color: Colors.red)),
            ),
          ],
        );
      },
    );

    if (confirmar == true) {
      try {
        await _service.delete${modelName}(widget.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('${modelName} eliminado')),
          );
          Navigator.of(context).pop(true);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error al eliminar: \$e')),
          );
        }
      }
    }
  }

  void _navegarAEditar() async {
    final resultado = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => ${modelName}FormPage(id: widget.id)),
    );
    if (resultado == true) {
      _cargarDatos();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalle de ${modelName}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: _navegarAEditar,
            tooltip: 'Editar',
          ),
          IconButton(
            icon: const Icon(Icons.delete),
            onPressed: _eliminar,
            tooltip: 'Eliminar',
          ),
        ],
      ),
      body: FutureBuilder<${modelName}>(
        future: future${modelName},
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('\${snapshot.error}'));
          } else if (!snapshot.hasData) {
            return const Center(child: Text('${modelName} no encontrado.'));
          }

          final modelo = snapshot.data!;
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView(
              children: [
${detailFields}
${subListBuilders}
              ],
            ),
          );
        },
      ),
    );
  }
}
`;
    await fs.writeFile(path.join(pagesDir, `${fileName}_detail_page.dart`), content.trim());
};

// --- Generador de Página de Formulario (Maneja many-to-one) ---
const generarPaginaFormulario = async (pagesDir, modelName, fileName, columns, relations = [], projectName) => {
    const pkCol = columns.find(c => c.constraints.includes('PK')) || { name: 'id' };
    const pkName = toCamelCase(pkCol.name || 'id');
    
    const relationImports = relations
        .map(rel => `
import 'package:${projectName}/models/${rel.targetFileName}.dart';
import 'package:${projectName}/services/${rel.targetFileName}_service.dart';
`)
        .join('');

    const relationServices = relations
        .map(rel => `  final _${rel.targetName}Service = ${rel.targetModel}Service();`)
        .join('\n');
        
    const relationFutures = relations
        .map(rel => `  late Future<List<${rel.targetModel}>> _future${rel.targetModel}s;`)
        .join('\n');
        
    const relationSelectedVars = relations
        .map(rel => `  int? _selected${rel.targetModel}Id;`)
        .join('\n');

    const loadRelationFutures = relations
        .map(rel => `    _future${rel.targetModel}s = _${rel.targetName}Service.fetchAll${rel.targetModel}s();`)
        .join('\n');
        
    const foreignKeyNames = relations.map(rel => `${rel.targetName}_id`);
    
    const controllers = columns
        .filter(c => c.name !== pkCol.name && !foreignKeyNames.includes(c.name))
        .map(c => `  final _${toCamelCase(c.name)}Controller = TextEditingController();`)
        .join('\n');

    const loadData = columns
        .filter(c => c.name !== pkCol.name && !foreignKeyNames.includes(c.name))
        .map(c => {
            const camelName = toCamelCase(c.name);
            return `          _${camelName}Controller.text = modelo.${camelName}?.toString() ?? '';`;
        })
        .join('\n');
    
    const loadRelationData = relations
        .map(rel => `        _selected${rel.targetModel}Id = modelo.${rel.targetName}?.${pkName};`)
        .join('\n');

    const formFields = columns
        .filter(c => c.name !== pkCol.name && !foreignKeyNames.includes(c.name))
        .map(c => {
            const camelName = toCamelCase(c.name);
            const pascalName = toPascalCase(c.name);
            const dartType = mapToDartType(c.type);
            
            let keyboardType = 'TextInputType.text';
            if (dartType === 'int' || dartType === 'double') {
                keyboardType = 'TextInputType.number';
            }

            return `
            TextFormField(
              controller: _${camelName}Controller,
              decoration: const InputDecoration(labelText: '${pascalName}'),
              keyboardType: ${keyboardType},
              validator: (value) {
                // if (value == null || value.isEmpty) {
                //   return 'Por favor ingrese un ${pascalName}';
                // }
                return null;
              },
            ),`;
        })
        .join('\n');

    const dropdownFields = relations
        .map(rel => `
            FutureBuilder<List<${rel.targetModel}>>(
              future: _future${rel.targetModel}s,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const CircularProgressIndicator();
                }
                if (snapshot.hasError || !snapshot.hasData) {
                  return const Text('Error al cargar ${rel.targetModel}s');
                }
                
                final items = snapshot.data!;
                int? currentValue = _selected${rel.targetModel}Id;
                if (currentValue != null && !items.any((item) => item.id == currentValue)) {
                  currentValue = null;
                }

                return DropdownButtonFormField<int>(
                  value: currentValue,
                  decoration: const InputDecoration(labelText: '${rel.targetModel}'),
                  items: items.map((item) {
                    final itemJson = item.toJson();
                    final String displayField;
                    if (itemJson.containsKey('nombre')) {
                      displayField = itemJson['nombre']?.toString() ?? 'N/A';
                    } else if (itemJson.containsKey('titulo')) {
                      displayField = itemJson['titulo']?.toString() ?? 'N/A';
                    } else {
                      displayField = 'ID: \${itemJson['id']?.toString() ?? 'N/A'}';
                    }
                    return DropdownMenuItem<int>(
                      value: item.id,
                      child: Text(displayField),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _selected${rel.targetModel}Id = value;
                    });
                  },
                  validator: (value) {
                    if (value == null) {
                      return 'Por favor seleccione un ${rel.targetModel}';
                    }
                    return null;
                  },
                );
              },
            ),
        `)
        .join('\n');

    const buildObjectColumns = columns
        .filter(c => !foreignKeyNames.includes(c.name))
        .map(c => {
            const camelName = toCamelCase(c.name);
            if (c.name === pkCol.name) {
                return `      ${camelName}: _modeloExistente?.${camelName},`;
            }

            const dartType = mapToDartType(c.type);
            let parser = `_${camelName}Controller.text`;

            if (dartType === 'int') {
                parser = `int.tryParse(_${camelName}Controller.text)`;
            } else if (dartType === 'double') {
                parser = `double.tryParse(_${camelName}Controller.text)`;
            } else if (dartType === 'DateTime') {
                parser = `DateTime.tryParse(_${camelName}Controller.text)`;
            } else if (dartType === 'bool') {
                parser = `_${camelName}Controller.text.toLowerCase() == 'true'`;
            } else {
                 parser = `_${camelName}Controller.text.isEmpty ? null : _${camelName}Controller.text`;
            }

            return `      ${camelName}: ${parser},`;
        })
        .join('\n');
        
    const buildObjectRelations = relations
        .map(rel => `      ${rel.targetName}: _selected${rel.targetModel}Id != null ? ${rel.targetModel}(id: _selected${rel.targetModel}Id) : null,`)
        .join('\n');
        
    const buildObject = [buildObjectColumns, buildObjectRelations].filter(Boolean).join('\n');

    const content = `
import 'package:flutter/material.dart';
import 'package:${projectName}/models/${fileName}.dart';
import 'package:${projectName}/services/${fileName}_service.dart';
${relationImports}

class ${modelName}FormPage extends StatefulWidget {
  final int? id;
  const ${modelName}FormPage({super.key, this.id});

  @override
  State<${modelName}FormPage> createState() => _${modelName}FormPageState();
}

class _${modelName}FormPageState extends State<${modelName}FormPage> {
  final _formKey = GlobalKey<FormState>();
  final _service = ${modelName}Service();
  bool _isLoading = false;
  ${modelName}? _modeloExistente;

${controllers}

${relationServices}
${relationFutures}
${relationSelectedVars}

  @override
  void initState() {
    super.initState();
${loadRelationFutures}
    if (widget.id != null) {
      _cargarDatos();
    }
  }

  Future<void> _cargarDatos() async {
    setState(() { _isLoading = true; });
    try {
      final modelo = await _service.fetch${modelName}ById(widget.id!);
      setState(() {
        _modeloExistente = modelo;
${loadData}
${loadRelationData}
        _isLoading = false;
      });
    } catch (e) {
      setState(() { _isLoading = false; });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al cargar datos: \$e')),
        );
      }
    }
  }

  Future<void> _guardar() async {
    if (_formKey.currentState?.validate() ?? false) {
      setState(() { _isLoading = true; });

      try {
        final modelo = ${modelName}(
${buildObject}
        );

        if (widget.id == null) {
          await _service.create${modelName}(modelo);
        } else {
          await _service.update${modelName}(widget.id!, modelo);
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('${modelName} guardado exitosamente')),
          );
          Navigator.of(context).pop(true);
        }
      } catch (e) {
        setState(() { _isLoading = false; });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error al guardar: \$e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.id == null ? 'Crear ${modelName}' : 'Editar ${modelName}'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: ListView(
                  children: [
${formFields}
${dropdownFields}
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _guardar,
                      child: const Text('Guardar'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
`;
    await fs.writeFile(path.join(pagesDir, `${fileName}_form_page.dart`), content.trim());
};

// --- Funciones de Utilidad ---
const toPascalCase = (str) => {
    if (!str) return '';
    return str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());
}

const toCamelCase = (str) => {
    if (!str) return '';
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

const toSnakeCase = (str) => {
    if (!str) return '';
    // Manejar casos como 'MiTabla' -> 'mi_tabla'
    return str
        .replace(/[A-Z]/g, (letter, index) => {
            return index === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`;
        })
        .replace(/^_/, ''); // Asegurarse de que no empiece con _ si la entrada era PascalCase
}

const mapToDartType = (sqlType) => {
    const type = (sqlType || '').toUpperCase();
    if (type.includes('INT')) return 'int';
    if (type.includes('VARCHAR') || type.includes('TEXT') || type.includes('CHAR')) return 'String';
    if (type.includes('DECIMAL') || type.includes('FLOAT') || type.includes('DOUBLE')) return 'double';
    if (type.includes('BOOLEAN') || type.includes('BOOL')) return 'bool';
    if (type.includes('DATE') || type.includes('TIMESTAMP') || type.includes('DATETIME')) return 'DateTime';
    return 'String'; // Fallback
};

module.exports = { generarEstructuraFlutter };