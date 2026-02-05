// 🧪 Node Launcher Test - Sistema de gestión de nodos
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log("🧪 === NODE LAUNCHER SYSTEM TEST === 🧪\n");

/**
 * Test utilities para verificar puertos y procesos
 */
class NodeLauncherTest {
  constructor() {
    this.testResults = [];
    this.testPorts = [3000, 3001, 3002, 5001, 5002, 5003];
  }

  /**
   * Verificar si un puerto está ocupado
   */
  async isPortInUse(port) {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr ":${port}"`);
      return stdout.trim().length > 0;
    } catch (error) {
      return false; // Puerto libre
    }
  }

  /**
   * Verificar que todos los puertos estén libres
   */
  async checkPortsAvailable() {
    console.log("🔍 === VERIFICANDO PUERTOS DISPONIBLES === 🔍");
    
    for (const port of this.testPorts) {
      const inUse = await this.isPortInUse(port);
      console.log(`📡 Puerto ${port}: ${inUse ? '🔴 Ocupado' : '🟢 Libre'}`);
      
      this.testResults.push({
        name: `Puerto ${port} disponible`,
        result: !inUse,
        critical: true
      });
    }
  }

  /**
   * Test del script stopNodes.js
   */
  async testStopNodes() {
    console.log("\n🛑 === TEST STOP NODES === 🛑");
    
    return new Promise((resolve) => {
      const stopProcess = spawn('node', ['stopNodes.js'], {
        stdio: 'pipe'
      });

      let output = '';
      
      stopProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      stopProcess.on('close', (code) => {
        console.log("✅ Script stopNodes.js ejecutado");
        console.log(`📊 Código de salida: ${code}`);
        
        this.testResults.push({
          name: "StopNodes script ejecutable",
          result: code === 0,
          critical: false
        });
        
        resolve();
      });

      stopProcess.on('error', (error) => {
        console.log("❌ Error ejecutando stopNodes.js:", error.message);
        this.testResults.push({
          name: "StopNodes script ejecutable",
          result: false,
          critical: false
        });
        resolve();
      });
    });
  }

  /**
   * Test del launcher simple
   */
  async testSimpleLauncher() {
    console.log("\n⚡ === TEST SIMPLE LAUNCHER === ⚡");
    
    return new Promise((resolve) => {
      const launcherProcess = spawn('node', ['simpleNodeLauncher.js'], {
        stdio: 'pipe'
      });

      let output = '';
      let hasStartedNodes = false;
      
      launcherProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        
        // Verificar que inicia los nodos
        if (text.includes('Iniciando en HTTP')) {
          hasStartedNodes = true;
        }
      });

      // Matar el proceso después de 5 segundos
      setTimeout(() => {
        launcherProcess.kill('SIGTERM');
        
        console.log("✅ Simple launcher ejecutado por 5 segundos");
        console.log(`📝 Output incluye inicio de nodos: ${hasStartedNodes ? 'Sí' : 'No'}`);
        
        this.testResults.push({
          name: "Simple launcher inicia nodos",
          result: hasStartedNodes,
          critical: true
        });
        
        resolve();
      }, 5000);

      launcherProcess.on('error', (error) => {
        console.log("❌ Error ejecutando simpleNodeLauncher.js:", error.message);
        this.testResults.push({
          name: "Simple launcher ejecutable",
          result: false,
          critical: true
        });
        resolve();
      });
    });
  }

  /**
   * Test de verificación de archivos launcher
   */
  async testLauncherFiles() {
    console.log("\n📁 === TEST ARCHIVOS LAUNCHER === 📁");
    
    const files = [
      'nodeLauncher.js',
      'simpleNodeLauncher.js', 
      'stopNodes.js'
    ];

    for (const file of files) {
      try {
        const { stdout } = await execAsync(`node -c ${file}`);
        console.log(`✅ ${file}: Sintaxis válida`);
        
        this.testResults.push({
          name: `${file} sintaxis válida`,
          result: true,
          critical: true
        });
      } catch (error) {
        console.log(`❌ ${file}: Error de sintaxis`);
        console.log(`   ${error.message}`);
        
        this.testResults.push({
          name: `${file} sintaxis válida`,
          result: false,
          critical: true
        });
      }
    }
  }

  /**
   * Test de package.json scripts
   */
  async testNpmScripts() {
    console.log("\n📦 === TEST NPM SCRIPTS === 📦");
    
    const scripts = [
      'network',
      'network:simple',
      'single-node',
      'stop-nodes'
    ];

    for (const script of scripts) {
      try {
        const { stdout } = await execAsync(`npm run ${script} --dry-run`);
        console.log(`✅ npm run ${script}: Script disponible`);
        
        this.testResults.push({
          name: `npm run ${script} disponible`,
          result: true,
          critical: false
        });
      } catch (error) {
        console.log(`❌ npm run ${script}: Script no disponible`);
        
        this.testResults.push({
          name: `npm run ${script} disponible`,
          result: false,
          critical: false
        });
      }
    }
  }

  /**
   * Ejecutar todos los tests
   */
  async runAllTests() {
    console.log("🚀 Iniciando tests del sistema de nodos...\n");

    await this.checkPortsAvailable();
    await this.testLauncherFiles();
    await this.testNpmScripts();
    await this.testStopNodes();
    
    // Solo si los puertos están libres, probar el launcher
    const portsAvailable = this.testResults
      .filter(r => r.name.includes('Puerto') && r.critical)
      .every(r => r.result);
    
    if (portsAvailable) {
      await this.testSimpleLauncher();
      // Limpiar después del test
      await this.testStopNodes();
    } else {
      console.log("⚠️ Saltando test de launcher - puertos ocupados");
    }

    this.showResults();
  }

  /**
   * Mostrar resultados finales
   */
  showResults() {
    console.log("\n🎯 === RESULTADOS FINALES === 🎯");

    const criticalTests = this.testResults.filter(r => r.critical);
    const nonCriticalTests = this.testResults.filter(r => !r.critical);

    console.log("\n🔴 Tests Críticos:");
    criticalTests.forEach(test => {
      console.log(`${test.result ? '✅' : '❌'} ${test.name}`);
    });

    console.log("\n🔵 Tests Adicionales:");
    nonCriticalTests.forEach(test => {
      console.log(`${test.result ? '✅' : '❌'} ${test.name}`);
    });

    const criticalPassed = criticalTests.filter(t => t.result).length;
    const criticalTotal = criticalTests.length;
    const totalPassed = this.testResults.filter(t => t.result).length;
    const totalTests = this.testResults.length;

    console.log(`\n📊 Tests críticos: ${criticalPassed}/${criticalTotal}`);
    console.log(`📊 Tests totales: ${totalPassed}/${totalTests}`);

    if (criticalPassed === criticalTotal) {
      console.log("\n🎉 ¡Sistema de nodos listo para usar!");
      console.log("💡 Puedes ejecutar: npm run network");
    } else {
      console.log("\n⚠️ Algunos tests críticos fallaron");
      console.log("💡 Revisar configuración antes de usar");
    }

    console.log("\n💡 El sistema de gestión de nodos permite:");
    console.log("   - ✅ Lanzar múltiples nodos automáticamente");
    console.log("   - ✅ Gestión de puertos y procesos"); 
    console.log("   - ✅ Limpieza automática de recursos");
    console.log("   - ✅ Scripts npm integrados");
    console.log("   - ✅ Logs coloridos por nodo");
  }
}

// Ejecutar tests
const tester = new NodeLauncherTest();
tester.runAllTests().catch(error => {
  console.error("💥 Error durante los tests:", error);
});

export { NodeLauncherTest };