// Declarative pipeline for Finance Budgeter — Kubernetes Cloud edition
//
// Runs every stage inside a dedicated Kubernetes pod so the Jenkins controller
// needs no Python/Node installed locally.  The official Docker images ship with
// venv and npm out of the box — no apt-get workarounds needed.
//
// One-time Jenkins setup:
//   • Kubernetes Cloud configured and reachable
//   • Credential "kubeconfig-prod"  — kubeconfig file for the target cluster
//   • Credential "registry-creds"   — username/password for your image registry
//   • env var  REGISTRY             — registry host (e.g. ghcr.io/youruser)
//
// Unit tests run against SQLite — no MySQL pod needed.
// Integration tests (@pytest.mark.integration) are skipped by default.

pipeline {

    agent {
        kubernetes {
            label "finance-budgeter-${env.BUILD_NUMBER}"
            yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: finance-budgeter-ci
spec:
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

    # ── Docker container (image build + push) ──────────────────────────────────
    - name: docker
      image: docker:24-cli
      imagePullPolicy: IfNotPresent
      command: [cat]
      tty: true
      volumeMounts:
        - name: docker-sock
          mountPath: /var/run/docker.sock

    # ── kubectl container (deploy to cluster) ─────────────────────────────────
    - name: kubectl
      image: registry.k8s.io/kubectl:v1.30.0
      imagePullPolicy: IfNotPresent
      command: [cat]
      tty: true
      resources:
        requests:
          memory: "128Mi"
          cpu: "100m"
        limits:
          memory: "256Mi"
          cpu: "200m"

  volumes:
    # Mount the host Docker socket so the docker container can build images
    - name: docker-sock
      hostPath:
        path: /var/run/docker.sock
"""
        }
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        disableConcurrentBuilds()
        timestamps()
    }

    environment {
        CI        = 'true'
        REGISTRY  = 'registry.home.strtoucane.me/strangetoucane'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {

        // ── 1. Backend tests ───────────────────────────────────────────────────
        stage('Backend: install deps') {
            steps {
                container('python') {
                    dir('backend') {
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

        // ── 2. Frontend tests + build ──────────────────────────────────────────
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

        // ── 3. Build & push Docker images ─────────────────────────────────────
        stage('Docker: build & push') {
            when { branch 'main' }
            steps {
                container('docker') {
                    withCredentials([usernamePassword(
                        credentialsId: 'registry-creds',
                        usernameVariable: 'REG_USER',
                        passwordVariable: 'REG_PASS'
                    )]) {
                        sh '''
                            echo "$REG_PASS" | docker login ${REGISTRY} -u "$REG_USER" --password-stdin

                            # Backend
                            docker build -t ${REGISTRY}/finance-budgeter-backend:${IMAGE_TAG} \
                                         -t ${REGISTRY}/finance-budgeter-backend:latest \
                                         ./backend

                            # Frontend (multi-stage: node build → nginx serve)
                            docker build -t ${REGISTRY}/finance-budgeter-frontend:${IMAGE_TAG} \
                                         -t ${REGISTRY}/finance-budgeter-frontend:latest \
                                         ./frontend

                            docker push ${REGISTRY}/finance-budgeter-backend:${IMAGE_TAG}
                            docker push ${REGISTRY}/finance-budgeter-backend:latest
                            docker push ${REGISTRY}/finance-budgeter-frontend:${IMAGE_TAG}
                            docker push ${REGISTRY}/finance-budgeter-frontend:latest
                        '''
                    }
                }
            }
        }

        // ── 4. Deploy to Kubernetes ────────────────────────────────────────────
        stage('Deploy') {
            when { branch 'main' }
            steps {
                container('kubectl') {
                    withCredentials([file(credentialsId: '123', variable: 'KUBECONFIG')]) {
                        sh '''
                            # 1. Namespace (must exist before everything else)
                            kubectl apply -f k8s/namespace.yaml

                            # 2. MySQL — bring up (or no-op if already running)
                            #    Prereq: finance-mysql-secret must be pre-created on the cluster.
                            kubectl apply -f k8s/mysql-statefulset.yaml
                            kubectl rollout status statefulset/finance-mysql \
                                --namespace=finance --timeout=180s

                            # 3. Apply Deployments (registry is already set in the YAML).
                            #    kubectl set image below will pin to the exact build tag.
                            #    Prereq: finance-backend-secret and registry-pull-secret must be
                            #    pre-created on the cluster.
                            kubectl apply -f k8s/backend-deployment.yaml
                            kubectl apply -f k8s/frontend-deployment.yaml

                            # 4. Services and ingress (idempotent)
                            kubectl apply -f k8s/backend-service.yaml
                            kubectl apply -f k8s/frontend-service.yaml
                            kubectl apply -f k8s/ingress.yaml

                            # 5. Pin both deployments to the exact build image tag
                            kubectl set image deployment/finance-backend \
                                backend=${REGISTRY}/finance-budgeter-backend:${IMAGE_TAG} \
                                --namespace=finance

                            kubectl set image deployment/finance-frontend \
                                frontend=${REGISTRY}/finance-budgeter-frontend:${IMAGE_TAG} \
                                --namespace=finance

                            # 6. Wait for rollouts to finish
                            kubectl rollout status deployment/finance-backend \
                                --namespace=finance --timeout=120s
                            kubectl rollout status deployment/finance-frontend \
                                --namespace=finance --timeout=120s
                        '''
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
