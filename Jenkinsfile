// Declarative pipeline for Finance Budgeter
// Requires on the Jenkins agent:
//   - Python 3.9+  (accessible as 'python3')
//   - Node.js 18+  (accessible as 'node' / 'npm')
//   - sudo apt-get access OR python3-venv already installed
//     (on Debian/Ubuntu the pipeline installs python3-venv automatically)
//
// Unit tests run against SQLite — no MySQL service needed.
// Integration tests (marked @pytest.mark.integration) are skipped unless
// the INTEGRATION_TESTS environment variable is set to 'true'.

pipeline {
    agent any

    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        disableConcurrentBuilds()
    }

    environment {
        PYTHONDONTWRITEBYTECODE = '1'
        PYTHONUNBUFFERED        = '1'
        // Keeps SQLite test file out of the workspace root
        DATABASE_URL            = 'sqlite:///./test_finance.db'
        CI                      = 'true'
    }

    stages {

        // ── 1. Backend unit tests ─────────────────────────────────────────────
        stage('Backend: install deps') {
            steps {
                dir('backend') {
                    sh '''
                        # On Debian/Ubuntu, python3-venv is a separate package.
                        # Detect the exact Python version and install its venv package.
                        PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
                        if ! python3 -c "import ensurepip" 2>/dev/null; then
                            sudo apt-get install -y "python${PY_VER}-venv"
                        fi
                        python3 -m venv .venv
                        . .venv/bin/activate
                        pip install --quiet --upgrade pip
                        pip install --quiet -r requirements.txt -r requirements-test.txt
                    '''
                }
            }
        }

        stage('Backend: unit tests') {
            steps {
                dir('backend') {
                    sh '''
                        . .venv/bin/activate
                        mkdir -p reports
                        # Omit patterns are read from .coveragerc — no --cov-omit needed
                        pytest -m "not integration" \
                               --junit-xml=reports/junit-backend.xml \
                               --cov=. \
                               --cov-report=xml:reports/coverage-backend.xml \
                               --cov-report=term-missing
                    '''
                }
            }
            post {
                always {
                    junit 'backend/reports/junit-backend.xml'
                    recordCoverage(
                        tools: [[parser: 'COBERTURA', pattern: 'backend/reports/coverage-backend.xml']],
                        id: 'backend-coverage',
                        name: 'Backend Coverage'
                    )
                    // Clean up SQLite test artefact
                    sh 'rm -f backend/test_finance.db'
                }
            }
        }

        // ── 2. Frontend unit tests ────────────────────────────────────────────
        stage('Frontend: install deps') {
            steps {
                dir('frontend') {
                    sh 'npm ci --prefer-offline'
                }
            }
        }

        stage('Frontend: unit tests') {
            steps {
                dir('frontend') {
                    sh '''
                        mkdir -p reports
                        npm test -- --reporter=verbose --reporter=junit \
                            --outputFile.junit=reports/junit-frontend.xml
                    '''
                }
            }
            post {
                always {
                    junit 'frontend/reports/junit-frontend.xml'
                }
            }
        }

        // ── 3. Frontend build (smoke-check the production bundle) ─────────────
        stage('Frontend: build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }
    }

    // ── Post-pipeline actions ─────────────────────────────────────────────────
    post {
        success {
            echo "All stages passed. Build #${env.BUILD_NUMBER} is green."
        }
        failure {
            echo "Build #${env.BUILD_NUMBER} failed — check the test reports above."
        }
        always {
            // Archive JUnit XML so they are downloadable from the build page
            archiveArtifacts artifacts: '**/reports/junit-*.xml, **/reports/coverage-*.xml',
                             allowEmptyArchive: true
            cleanWs()
        }
    }
}
