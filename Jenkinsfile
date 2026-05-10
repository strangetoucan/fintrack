// Declarative pipeline for Finance Budgeter — Kubernetes Cloud edition
//
// Runs every stage inside a dedicated Kubernetes pod so the Jenkins controller
// needs no Python/Node installed locally.  The official Docker images ship with
// venv and npm out of the box — no apt-get workarounds needed.
//
// Prerequisites (one-time, in Jenkins → Manage Jenkins → Clouds):
//   • Kubernetes Cloud configured and reachable
//   • KUBECONFIG credential (if deploying) stored as "kubeconfig-prod"
//
// Unit tests run against SQLite — no MySQL pod needed.
// Integration tests (@pytest.mark.integration) are skipped by default.

pipeline {

    agent {
        kubernetes {
            // Pod is spun up fresh for every build and destroyed on completion.
            label "finance-budgeter-${env.BUILD_NUMBER}"
            yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: finance-budgeter-ci
spec:
  # Allow pulling from private registries if needed
  # imagePullSecrets:
  #   - name: registry-secret

  containers:

    # ── Python container (backend tests) ──────────────────────────────────────
    - name: python
      image: python:3.13-slim
      imagePullPolicy: IfNotPresent
      command: [cat]
      tty: true
      env:
        - name: PYTHONDONTWRITEBYTECODE
          value: "1"
        - name: PYTHONUNBUFFERED
          value: "1"
        - name: DATABASE_URL
          value: "sqlite:///./test_finance.db"
      resources:
        requests:
          memory: "512Mi"
          cpu: "250m"
        limits:
          memory: "1Gi"
          cpu: "500m"

    # ── Node container (frontend tests + build) ────────────────────────────────
    - name: node
      image: node:20-alpine
      imagePullPolicy: IfNotPresent
      command: [cat]
      tty: true
      env:
        - name: CI
          value: "true"
      resources:
        requests:
          memory: "512Mi"
          cpu: "250m"
        limits:
          memory: "1Gi"
          cpu: "500m"

"""
        }
    }

    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        disableConcurrentBuilds()
        timestamps()
    }

    environment {
        CI = 'true'
    }

    stages {

        // ── 1. Backend ─────────────────────────────────────────────────────────
        stage('Backend: install deps') {
            steps {
                container('python') {
                    dir('backend') {
                        // python:3.13-slim ships with pip + venv — no apt needed
                        sh '''
                            pip install --quiet --upgrade pip
                            pip install --quiet -r requirements.txt -r requirements-test.txt
                        '''
                    }
                }
            }
        }

        stage('Backend: unit tests') {
            steps {
                container('python') {
                    dir('backend') {
                        sh '''
                            mkdir -p reports
                            pytest -m "not integration" \
                                   --junit-xml=reports/junit-backend.xml \
                                   --cov=. \
                                   --cov-report=xml:reports/coverage-backend.xml \
                                   --cov-report=term-missing
                        '''
                    }
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
                }
            }
        }

        // ── 2. Frontend ────────────────────────────────────────────────────────
        stage('Frontend: install deps') {
            steps {
                container('node') {
                    dir('frontend') {
                        sh 'npm install'
                    }
                }
            }
        }

        stage('Frontend: unit tests') {
            steps {
                container('node') {
                    dir('frontend') {
                        sh '''
                            mkdir -p reports
                            npm test -- --reporter=verbose --reporter=junit \
                                --outputFile.junit=reports/junit-frontend.xml
                        '''
                    }
                }
            }
            post {
                always {
                    junit 'frontend/reports/junit-frontend.xml'
                }
            }
        }

        stage('Frontend: build') {
            steps {
                container('node') {
                    dir('frontend') {
                        sh 'npm run build'
                    }
                }
            }
        }

    }

    // ── Post-pipeline ──────────────────────────────────────────────────────────
    post {
        success {
            echo "Build #${env.BUILD_NUMBER} passed."
        }
        failure {
            echo "Build #${env.BUILD_NUMBER} failed — check the test reports above."
        }
        always {
            archiveArtifacts artifacts: '**/reports/junit-*.xml, **/reports/coverage-*.xml',
                             allowEmptyArchive: true
            cleanWs()
        }
    }
}
