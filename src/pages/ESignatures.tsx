import { useState, useRef, useEffect, useCallback } from 'react';
import {
  PenLine,
  FileCheck,
  Clock,
  CheckCircle2,
  X,
  Eraser,
  Send,
  User,
  Mail,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getEstimates, getSignatures, addSignature, updateEstimate, uid } from '../store';
import type { Estimate, Signature } from '../types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getEstimateTotal(estimate: Estimate): number {
  return estimate.lineItems.reduce((sum, li) => {
    const labor = li.manHours * li.laborRate * li.quantity;
    const material = li.materialCost * li.quantity;
    return sum + labor + material;
  }, 0);
}

function generateIpPlaceholder(): string {
  const lastOctet = Math.floor(Math.random() * 254) + 1;
  return `192.168.1.${lastOctet}`;
}

export default function ESignatures() {
  const [estimates, setEstimates] = useState<Estimate[]>(() => getEstimates());
  const [signatures, setSignaturesState] = useState<Signature[]>(() => getSignatures());

  // Signing state
  const [signingEstimateId, setSigningEstimateId] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Audit trail expand
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derived data
  const pendingEstimates = estimates.filter(
    (e) =>
      e.status === 'sent' &&
      !signatures.some((s) => s.estimateId === e.id)
  );

  const signedSignatures = signatures
    .map((sig) => ({
      signature: sig,
      estimate: estimates.find((e) => e.id === sig.estimateId),
    }))
    .filter((item) => item.estimate !== undefined)
    .sort(
      (a, b) =>
        new Date(b.signature.signedAt).getTime() -
        new Date(a.signature.signedAt).getTime()
    );

  const signingEstimate = signingEstimateId
    ? estimates.find((e) => e.id === signingEstimateId) ?? null
    : null;

  // Initialize canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = 200;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Light gray background
    ctx.fillStyle = '#f5f5f4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Signature line
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, canvas.height - 50);
    ctx.lineTo(canvas.width - 40, canvas.height - 50);
    ctx.stroke();

    // "Sign here" label
    ctx.fillStyle = '#a8a29e';
    ctx.font = '12px sans-serif';
    ctx.fillText('Sign here', 40, canvas.height - 30);

    // Set drawing style
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    if (signingEstimateId) {
      // Small delay to ensure the canvas is mounted
      const timer = setTimeout(() => {
        initCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [signingEstimateId, initCanvas]);

  // Canvas event handlers
  function getCanvasPoint(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function handlePointerMove(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!isDrawing) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function handlePointerUp() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    setHasDrawn(false);
    initCanvas();
  }

  function handleStartSigning(estimateId: string) {
    const estimate = estimates.find((e) => e.id === estimateId);
    setSigningEstimateId(estimateId);
    setSignerName(estimate?.clientName ?? '');
    setSignerEmail(estimate?.clientEmail ?? '');
    setHasDrawn(false);
  }

  function handleCancel() {
    setSigningEstimateId(null);
    setSignerName('');
    setSignerEmail('');
    setHasDrawn(false);
  }

  function handleSignAndSubmit() {
    if (!signingEstimate || !canvasRef.current || !signerName.trim() || !signerEmail.trim() || !hasDrawn) {
      return;
    }

    const signatureData = canvasRef.current.toDataURL('image/png');
    const now = new Date().toISOString();
    const ipAddress = generateIpPlaceholder();

    const newSignature: Signature = {
      id: uid(),
      estimateId: signingEstimate.id,
      signerName: signerName.trim(),
      signerEmail: signerEmail.trim(),
      signatureData,
      signedAt: now,
      ipAddress,
    };

    addSignature(newSignature);

    const updatedEstimate: Estimate = {
      ...signingEstimate,
      status: 'approved',
      signatureData,
      signedAt: now,
      updatedAt: now,
    };
    updateEstimate(updatedEstimate);

    // Refresh state
    setEstimates(getEstimates());
    setSignaturesState(getSignatures());
    handleCancel();
  }

  const canSubmit =
    signerName.trim().length > 0 &&
    signerEmail.trim().length > 0 &&
    hasDrawn;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
          E-Signatures
        </h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          Digital signature capture for estimates and contracts
        </p>
      </div>

      {/* Signature Capture Modal / Inline */}
      {signingEstimate && (
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Sign Estimate
              </h2>
            </div>
            <button
              onClick={handleCancel}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Cancel signing"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* Estimate Summary */}
            <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wide">
                Estimate Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-stone-500 dark:text-stone-400">Client: </span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {signingEstimate.clientName}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 dark:text-stone-400">Project Type: </span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {signingEstimate.projectType}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-700">
                      <th className="text-left py-2 pr-3 font-medium text-stone-500 dark:text-stone-400">
                        Description
                      </th>
                      <th className="text-right py-2 pr-3 font-medium text-stone-500 dark:text-stone-400">
                        Labor
                      </th>
                      <th className="text-right py-2 pr-3 font-medium text-stone-500 dark:text-stone-400">
                        Material
                      </th>
                      <th className="text-right py-2 font-medium text-stone-500 dark:text-stone-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                    {signingEstimate.lineItems.map((li) => {
                      const labor = li.manHours * li.laborRate * li.quantity;
                      const material = li.materialCost * li.quantity;
                      return (
                        <tr key={li.id}>
                          <td className="py-2 pr-3 text-stone-900 dark:text-stone-100">
                            {li.description}
                          </td>
                          <td className="py-2 pr-3 text-right text-stone-600 dark:text-stone-300">
                            {formatCurrency(labor)}
                          </td>
                          <td className="py-2 pr-3 text-right text-stone-600 dark:text-stone-300">
                            {formatCurrency(material)}
                          </td>
                          <td className="py-2 text-right font-medium text-stone-900 dark:text-stone-100">
                            {formatCurrency(labor + material)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-stone-300 dark:border-stone-600">
                      <td
                        colSpan={3}
                        className="py-2 pr-3 text-right font-semibold text-stone-900 dark:text-stone-100"
                      >
                        Total
                      </td>
                      <td className="py-2 text-right font-bold text-lg text-amber-600 dark:text-amber-400">
                        {formatCurrency(getEstimateTotal(signingEstimate))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Signer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="signer-name"
                  className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  <User className="w-4 h-4" />
                  Signer Name
                </label>
                <input
                  id="signer-name"
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Full legal name"
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="signer-email"
                  className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  <Mail className="w-4 h-4" />
                  Signer Email
                </label>
                <input
                  id="signer-email"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            {/* Signature Pad */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300">
                  <PenLine className="w-4 h-4" />
                  Signature
                </label>
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                >
                  <Eraser className="w-4 h-4" />
                  Clear
                </button>
              </div>
              <div
                ref={containerRef}
                className="rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-600 overflow-hidden"
              >
                <canvas
                  ref={canvasRef}
                  className="signature-canvas w-full cursor-crosshair"
                  style={{ height: 200 }}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
              </div>
              {!hasDrawn && (
                <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">
                  Draw your signature above using your mouse or finger
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleSignAndSubmit}
                disabled={!canSubmit}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                  canSubmit
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                Sign & Submit
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-lg text-sm font-medium border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Signatures */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Pending Signatures
            </h2>
            {pendingEstimates.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
                {pendingEstimates.length}
              </span>
            )}
          </div>
        </div>

        {pendingEstimates.length === 0 ? (
          <div className="px-5 py-10 text-center text-stone-400 dark:text-stone-500">
            <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No estimates awaiting signatures</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {pendingEstimates.map((estimate) => (
              <div
                key={estimate.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                    {estimate.clientName}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {estimate.projectType}
                    <span className="mx-1.5">&middot;</span>
                    {formatCurrency(getEstimateTotal(estimate))}
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                    Sent {formatDate(estimate.updatedAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    Awaiting Signature
                  </span>
                  <button
                    onClick={() => handleStartSigning(estimate.id)}
                    disabled={signingEstimateId !== null}
                    className={`flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                      signingEstimateId !== null
                        ? 'bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                    }`}
                  >
                    <PenLine className="w-4 h-4" />
                    Sign Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signed Documents */}
      <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Signed Documents
            </h2>
            {signedSignatures.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                {signedSignatures.length}
              </span>
            )}
          </div>
        </div>

        {signedSignatures.length === 0 ? (
          <div className="px-5 py-10 text-center text-stone-400 dark:text-stone-500">
            <PenLine className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No signed documents yet</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {signedSignatures.map(({ signature, estimate }) => {
              const isExpanded = expandedAuditId === signature.id;
              return (
                <div key={signature.id} className="px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Signature Preview */}
                    <div className="flex-shrink-0 w-[140px] h-[60px] rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden bg-stone-50 dark:bg-stone-800">
                      <img
                        src={signature.signatureData}
                        alt={`Signature of ${signature.signerName}`}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                          {estimate!.clientName}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle2 className="w-3 h-3" />
                          Signed
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {estimate!.projectType}
                        <span className="mx-1.5">&middot;</span>
                        {formatCurrency(getEstimateTotal(estimate!))}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Signed by <span className="font-medium text-stone-700 dark:text-stone-300">{signature.signerName}</span>
                        <span className="mx-1.5">&middot;</span>
                        {formatDateTime(signature.signedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Audit Trail Toggle */}
                  <button
                    onClick={() =>
                      setExpandedAuditId(isExpanded ? null : signature.id)
                    }
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 min-h-[44px] transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Audit Trail
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Audit Trail Details */}
                  {isExpanded && (
                    <div className="mt-2 bg-stone-50 dark:bg-stone-800 rounded-lg p-4 space-y-2 text-xs">
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                        <span className="text-stone-500 dark:text-stone-400 font-medium">
                          Signer Name
                        </span>
                        <span className="text-stone-900 dark:text-stone-100">
                          {signature.signerName}
                        </span>

                        <span className="text-stone-500 dark:text-stone-400 font-medium">
                          Signer Email
                        </span>
                        <span className="text-stone-900 dark:text-stone-100">
                          {signature.signerEmail}
                        </span>

                        <span className="text-stone-500 dark:text-stone-400 font-medium">
                          Signed At
                        </span>
                        <span className="text-stone-900 dark:text-stone-100">
                          {formatDateTime(signature.signedAt)}
                        </span>

                        <span className="text-stone-500 dark:text-stone-400 font-medium">
                          IP Address
                        </span>
                        <span className="text-stone-900 dark:text-stone-100">
                          {signature.ipAddress}
                        </span>

                        <span className="text-stone-500 dark:text-stone-400 font-medium">
                          Document
                        </span>
                        <span className="text-stone-900 dark:text-stone-100">
                          {estimate!.projectType} &mdash; {estimate!.clientName}
                        </span>

                        <span className="text-stone-500 dark:text-stone-400 font-medium">
                          Amount
                        </span>
                        <span className="text-stone-900 dark:text-stone-100">
                          {formatCurrency(getEstimateTotal(estimate!))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
